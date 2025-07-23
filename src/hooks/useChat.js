// src/hooks/useChat.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
  limit,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';

export const useChat = (otherUserId) => {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastMessage, setLastMessage] = useState(null);
  const unsubscribeRef = useRef(null);

  // إنشاء معرف المحادثة
  const getConversationId = useCallback((userId1, userId2) => {
    return [userId1, userId2].sort().join('_');
  }, []);

  // جلب الرسائل مع pagination
  const loadMessages = useCallback(async (conversationId, loadMore = false) => {
    if (!conversationId) return;

    try {
      let q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      if (loadMore && lastMessage) {
        q = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId),
          orderBy('createdAt', 'desc'),
          startAfter(lastMessage),
          limit(50)
        );
      }

      const snapshot = await getDocs(q);
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse(); // ترتيب تصاعدي للعرض

      if (loadMore) {
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }

      setHasMore(snapshot.docs.length === 50);
      if (snapshot.docs.length > 0) {
        setLastMessage(snapshot.docs[snapshot.docs.length - 1]);
      }

    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [lastMessage]);

  // الاستماع للرسائل الجديدة
  useEffect(() => {
    if (!userProfile || !otherUserId) {
      setLoading(false);
      return;
    }

    const conversationId = getConversationId(userProfile.id, otherUserId);
    
    // جلب الرسائل الأولى
    loadMessages(conversationId);

    // الاستماع للرسائل الجديدة فقط
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newMessage = {
            id: change.doc.id,
            ...change.doc.data()
          };

          // إضافة الرسالة الجديدة إذا لم تكن موجودة
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (!exists) {
              return [...prev, newMessage];
            }
            return prev;
          });

          // تحديد الرسالة كمقروءة إذا كانت للمستخدم الحالي
          if (newMessage.receiverId === userProfile.id && !newMessage.read) {
            markAsRead(newMessage.id);
          }
        }
      });
      
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userProfile, otherUserId, getConversationId, loadMessages]);

  // تحديد الرسالة كمقروءة
  const markAsRead = useCallback(async (messageId) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  // تحديد جميع رسائل المحادثة كمقروءة
  const markConversationAsRead = useCallback(async (conversationId) => {
    try {
      const batch = writeBatch(db);
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('receiverId', '==', userProfile.id),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [userProfile]);

  // إرسال رسالة نصية
  const sendMessage = useCallback(async (text, otherUser) => {
    if (!text.trim() || !userProfile || !otherUser) return false;

    setSending(true);
    try {
      const conversationId = getConversationId(userProfile.id, otherUser.id);
      
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: userProfile.id,
        senderName: `${userProfile.firstName} ${userProfile.lastName}`,
        receiverId: otherUser.id,
        text: text.trim(),
        type: 'text',
        participants: [userProfile.id, otherUser.id],
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    } finally {
      setSending(false);
    }
  }, [userProfile, getConversationId]);

  // إرسال ملف
  const sendFile = useCallback(async (fileUrl, fileName, fileSize, fileType, otherUser) => {
    if (!fileUrl || !userProfile || !otherUser) return false;

    setSending(true);
    try {
      const conversationId = getConversationId(userProfile.id, otherUser.id);
      const messageType = fileType.startsWith('image/') ? 'image' : 'file';
      
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: userProfile.id,
        senderName: `${userProfile.firstName} ${userProfile.lastName}`,
        receiverId: otherUser.id,
        type: messageType,
        fileUrl: fileUrl,
        fileName: fileName,
        fileSize: fileSize,
        text: messageType === 'image' ? '📷 صورة' : `📎 ${fileName}`,
        participants: [userProfile.id, otherUser.id],
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });

      return true;
    } catch (error) {
      console.error('Error sending file:', error);
      return false;
    } finally {
      setSending(false);
    }
  }, [userProfile, getConversationId]);

  // جلب المحادثات للمستخدم
  const loadConversations = useCallback(async () => {
    if (!userProfile) return;

    try {
      const q = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', userProfile.id),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const conversationsMap = new Map();

        snapshot.docs.forEach(doc => {
          const message = { id: doc.id, ...doc.data() };
          const otherUserId = message.participants.find(id => id !== userProfile.id);
          
          if (!conversationsMap.has(otherUserId) || 
              (message.createdAt && conversationsMap.get(otherUserId).lastMessage.createdAt &&
               message.createdAt.toMillis() > conversationsMap.get(otherUserId).lastMessage.createdAt.toMillis())) {
            
            conversationsMap.set(otherUserId, {
              otherUserId,
              conversationId: getConversationId(userProfile.id, otherUserId),
              lastMessage: message,
              unreadCount: 0 // سيتم حسابه لاحقاً
            });
          }
        });

        // حساب الرسائل غير المقروءة لكل محادثة
        conversationsMap.forEach((conversation, otherUserId) => {
          const unreadMessages = snapshot.docs.filter(doc => {
            const message = doc.data();
            return message.receiverId === userProfile.id && 
                   !message.read &&
                   message.participants.includes(otherUserId);
          });
          conversation.unreadCount = unreadMessages.length;
        });

        const conversationsList = Array.from(conversationsMap.values())
          .sort((a, b) => {
            const aTime = a.lastMessage.createdAt?.toMillis() || 0;
            const bTime = b.lastMessage.createdAt?.toMillis() || 0;
            return bTime - aTime;
          });

        setConversations(conversationsList);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, [userProfile, getConversationId]);

  // حذف رسالة
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        deleted: true,
        deletedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }, []);

  // البحث في الرسائل
  const searchMessages = useCallback(async (searchTerm, conversationId) => {
    if (!searchTerm.trim()) return [];

    try {
      let q = query(
        collection(db, 'messages'),
        where('text', '>=', searchTerm),
        where('text', '<=', searchTerm + '\uf8ff'),
        orderBy('text'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (conversationId) {
        q = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId),
          where('text', '>=', searchTerm),
          where('text', '<=', searchTerm + '\uf8ff'),
          orderBy('text'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }, []);

  // تحميل المزيد من الرسائل
  const loadMoreMessages = useCallback(() => {
    if (!otherUserId || !hasMore) return;
    
    const conversationId = getConversationId(userProfile.id, otherUserId);
    loadMessages(conversationId, true);
  }, [otherUserId, hasMore, userProfile, getConversationId, loadMessages]);

  // حالة الاتصال
  const isOnline = useCallback((userId) => {
    // يمكن تطوير هذا لاحقاً مع Firestore presence
    return false;
  }, []);

  return {
    messages,
    conversations,
    loading,
    sending,
    hasMore,
    sendMessage,
    sendFile,
    markAsRead,
    markConversationAsRead,
    loadConversations,
    deleteMessage,
    searchMessages,
    loadMoreMessages,
    isOnline
  };
};

export default useChat;