// src/components/Chat/ChatWindow.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, Image, Paperclip, Download, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const ChatWindow = ({ otherUser, onClose, isFullScreen = false }) => {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // إنشاء معرف فريد للمحادثة
  const conversationId = [userProfile.id, otherUser.id].sort().join('_');

  // تحسين scrolling
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  }, []);

  // جلب الرسائل مع تحسينات الأداء
  useEffect(() => {
    if (!userProfile || !otherUser) return;

    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const messagesData = [];
        const batch = writeBatch(db);
        let hasUnreadMessages = false;

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          messagesData.push({
            id: doc.id,
            ...data
          });

          // تحديد الرسائل كمقروءة إذا كانت مرسلة للمستخدم الحالي
          if (data.receiverId === userProfile.id && !data.read) {
            batch.update(doc.ref, { 
              read: true, 
              readAt: serverTimestamp() 
            });
            hasUnreadMessages = true;
          }
        });

        // تحديث الرسائل كمقروءة في batch واحد
        if (hasUnreadMessages) {
          batch.commit().catch(console.error);
        }

        setMessages(messagesData);
        
        // Scroll للأسفل عند وصول رسائل جديدة
        setTimeout(() => scrollToBottom(false), 100);
      },
      (error) => {
        console.error('Error fetching messages:', error);
      }
    );

    return () => unsubscribe();
  }, [userProfile, otherUser, conversationId, scrollToBottom]);

  // معالجة الكتابة
  const handleTyping = useCallback(() => {
    setIsTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, []);

  // رفع الملفات على السيرفر المحلي بدلاً من Firebase
  const uploadToLocalServer = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userProfile.id);
    formData.append('conversationId', conversationId);

    try {
      // إرسال للسيرفر المحلي
      const response = await fetch('/api/upload-chat-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      return result.fileUrl; // رابط الملف على السيرفر
    } catch (error) {
      console.error('Upload error:', error);
      
      // Fallback: تحويل الملف إلى base64 للتخزين المؤقت
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }
  };

  // معالجة رفع الملفات
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || uploading) return;

    // التحقق من نوع وحجم الملف
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      alert('نوع الملف غير مدعوم. الملفات المدعومة: صور، PDF، ملفات نصية');
      return;
    }

    if (file.size > maxSize) {
      alert('حجم الملف كبير جداً. الحد الأقصى 10 ميجا');
      return;
    }

    setUploading(true);

    try {
      const fileUrl = await uploadToLocalServer(file);
      const fileType = file.type.startsWith('image/') ? 'image' : 'file';
      
      // إرسال رسالة الملف
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: userProfile.id,
        senderName: `${userProfile.firstName} ${userProfile.lastName}`,
        receiverId: otherUser.id,
        type: fileType,
        fileUrl: fileUrl,
        fileName: file.name,
        fileSize: file.size,
        text: fileType === 'image' ? '📷 صورة' : `📎 ${file.name}`,
        participants: [userProfile.id, otherUser.id],
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('خطأ في رفع الملف');
    }
    
    setUploading(false);
    fileInputRef.current.value = '';
  };

  // إرسال الرسائل النصية
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: userProfile.id,
        senderName: `${userProfile.firstName} ${userProfile.lastName}`,
        receiverId: otherUser.id,
        text: messageText,
        type: 'text',
        participants: [userProfile.id, otherUser.id],
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('خطأ في إرسال الرسالة');
      setNewMessage(messageText); // إرجاع النص
    }
    
    setLoading(false);
  };

  // تنسيق الوقت
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) { // أقل من دقيقة
        return 'الآن';
      } else if (diff < 3600000) { // أقل من ساعة
        const minutes = Math.floor(diff / 60000);
        return `${minutes} د`;
      } else if (diff < 86400000) { // أقل من يوم
        return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
      }
    } catch (error) {
      return '';
    }
  };

  // تنسيق حجم الملف
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    else return Math.round(bytes / 1048576) + ' MB';
  };

  // معالجة الضغط على Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className={`${isFullScreen ? 'max-w-6xl mx-auto' : 'max-w-4xl mx-auto'}`}>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[600px] flex flex-col">
        {/* Header محسن */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors lg:hidden"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="font-semibold text-sm">
                {otherUser.firstName?.charAt(0)}{otherUser.lastName?.charAt(0)}
              </span>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">
                {otherUser.firstName} {otherUser.lastName}
              </h3>
              <p className="text-purple-100 text-sm">
                {otherUser.role === 'admin' ? 'الإدارة' : 
                 otherUser.role === 'trainer' ? 'مدرب' : 'طالب'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors hidden lg:block"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* منطقة الرسائل محسنة */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
          style={{ scrollBehavior: 'smooth' }}
        >
          {messages.map((msg, index) => {
            const isMyMessage = msg.senderId === userProfile.id;
            const showTime = index === 0 || 
              (messages[index - 1] && 
               Math.abs(new Date(msg.createdAt?.toDate()).getTime() - 
                       new Date(messages[index - 1].createdAt?.toDate()).getTime()) > 300000); // 5 دقائق

            return (
              <div key={msg.id}>
                {/* عرض الوقت */}
                {showTime && (
                  <div className="text-center my-4">
                    <span className="bg-white text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>
                )}
                
                {/* الرسالة */}
                <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md relative ${
                    isMyMessage
                      ? 'bg-purple-600 text-white rounded-l-2xl rounded-tr-2xl'
                      : 'bg-white text-gray-800 shadow-sm rounded-r-2xl rounded-tl-2xl border'
                  }`}>
                    
                    {/* محتوى الرسالة */}
                    {msg.type === 'image' ? (
                      <div className="p-2">
                        <img 
                          src={msg.fileUrl} 
                          alt="صورة مرسلة" 
                          className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.fileUrl, '_blank')}
                          loading="lazy"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs ${
                            isMyMessage ? 'text-purple-200' : 'text-gray-500'
                          }`}>
                            {formatMessageTime(msg.createdAt)}
                          </span>
                          {isMyMessage && (
                            <div className="flex items-center gap-1">
                              {msg.delivered && (
                                msg.read ? (
                                  <CheckCheck size={14} className="text-purple-200" />
                                ) : (
                                  <Check size={14} className="text-purple-200" />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : msg.type === 'file' ? (
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <Paperclip size={20} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{msg.fileName}</p>
                            <p className={`text-xs ${
                              isMyMessage ? 'text-purple-200' : 'text-gray-500'
                            }`}>
                              {formatFileSize(msg.fileSize)}
                            </p>
                          </div>
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-2 rounded-lg hover:bg-black/10 transition-colors ${
                              isMyMessage ? 'text-white' : 'text-gray-600'
                            }`}
                          >
                            <Download size={16} />
                          </a>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs ${
                            isMyMessage ? 'text-purple-200' : 'text-gray-500'
                          }`}>
                            {formatMessageTime(msg.createdAt)}
                          </span>
                          {isMyMessage && (
                            <div className="flex items-center gap-1">
                              {msg.delivered && (
                                msg.read ? (
                                  <CheckCheck size={14} className="text-purple-200" />
                                ) : (
                                  <Check size={14} className="text-purple-200" />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3">
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs ${
                            isMyMessage ? 'text-purple-200' : 'text-gray-500'
                          }`}>
                            {formatMessageTime(msg.createdAt)}
                          </span>
                          {isMyMessage && (
                            <div className="flex items-center gap-1">
                              {msg.delivered && (
                                msg.read ? (
                                  <CheckCheck size={14} className="text-purple-200" />
                                ) : (
                                  <Check size={14} className="text-purple-200" />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* مؤشر الكتابة */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p>ابدأ المحادثة مع {otherUser.firstName}</p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* منطقة الإدخال محسنة */}
        <div className="p-4 border-t bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
              title="إرفاق ملف"
            >
              {uploading ? (
                <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full" />
              ) : (
                <Paperclip size={20} />
              )}
            </button>
            
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={handleKeyPress}
                placeholder="اكتب رسالتك..."
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 resize-none max-h-24"
                disabled={loading}
                rows="1"
                style={{ minHeight: '48px' }}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !newMessage.trim()}
              className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
          
          {uploading && (
            <div className="mt-2 text-sm text-gray-600">
              جاري رفع الملف...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;