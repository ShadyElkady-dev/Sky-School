// src/components/Admin/AdminChat.js
import React, { useState } from 'react';
import { MessageCircle, Users, Search, Clock, CheckCircle, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';
import ChatWindow from '../Chat/ChatWindow';

const AdminChat = () => {
  const { userProfile } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get all students
  const { data: users } = useCollection('users');
  const students = users.filter(user => user.role === 'student');
  
  // Get all messages where admin is involved
  const { data: messages } = useCollection('messages', [
    where('participants', 'array-contains', userProfile.id)
  ]);
  
  // Get conversations with message counts
  const getConversations = () => {
    const conversations = {};
    
    messages.forEach(msg => {
      const otherUserId = msg.participants.find(id => id !== userProfile.id);
      if (!conversations[otherUserId]) {
        const student = students.find(s => s.id === otherUserId);
        if (student) {
          conversations[otherUserId] = {
            student,
            messages: [],
            unreadCount: 0,
            lastMessage: null
          };
        }
      }
      
      if (conversations[otherUserId]) {
        conversations[otherUserId].messages.push(msg);
        if (!msg.read && msg.senderId !== userProfile.id) {
          conversations[otherUserId].unreadCount++;
        }
        
        // Update last message
        if (!conversations[otherUserId].lastMessage || 
            (msg.createdAt && conversations[otherUserId].lastMessage.createdAt && 
             msg.createdAt.toMillis() > conversations[otherUserId].lastMessage.createdAt.toMillis())) {
          conversations[otherUserId].lastMessage = msg;
        }
      }
    });
    
    return Object.values(conversations).sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return b.lastMessage.createdAt.toMillis() - a.lastMessage.createdAt.toMillis();
    });
  };
  
  const conversations = getConversations();
  
  // Filter students based on search
  const filteredStudents = students.filter(student => 
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phone.includes(searchTerm)
  );
  
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ar-EG');
    }
  };

  if (selectedStudent) {
    return (
      <div className="space-y-6">
        <ChatWindow 
          otherUser={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">المحادثات</h2>
        <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
          <span className="font-semibold">{conversations.length}</span> محادثة نشطة
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Conversations */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <MessageCircle size={24} />
                المحادثات النشطة
              </h3>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {conversations.map(conversation => (
                <div
                  key={conversation.student.id}
                  onClick={() => setSelectedStudent(conversation.student)}
                  className="p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <User className="text-purple-600" size={24} />
                        </div>
                        {conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold">
                          {conversation.student.firstName} {conversation.student.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">{conversation.student.phone}</p>
                        {conversation.lastMessage && (
                          <p className="text-sm text-gray-500 truncate max-w-48">
                            {conversation.lastMessage.type === 'image' ? '📷 صورة' : 
                             conversation.lastMessage.type === 'file' ? '📎 ملف' : 
                             conversation.lastMessage.text}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {conversation.lastMessage && (
                        <p className="text-xs text-gray-500">
                          {formatMessageTime(conversation.lastMessage.createdAt)}
                        </p>
                      )}
                      {conversation.unreadCount > 0 && (
                        <div className="mt-1">
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            جديد
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {conversations.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="mx-auto mb-4" size={48} />
                  <p>لا توجد محادثات نشطة</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All Students */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Users size={24} />
                جميع الطلاب
              </h3>
              
              <div className="relative">
                <Search className="absolute right-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="ابحث عن طالب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border rounded-lg pr-12 pl-4 py-2 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {filteredStudents.map(student => {
                const hasConversation = conversations.some(c => c.student.id === student.id);
                
                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="text-gray-600" size={20} />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {student.firstName} {student.lastName}
                        </h4>
                        <p className="text-xs text-gray-600">{student.phone}</p>
                      </div>
                      
                      {hasConversation && (
                        <CheckCircle className="text-green-500" size={16} />
                      )}
                    </div>
                  </div>
                );
              })}
              
              {filteredStudents.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Users className="mx-auto mb-4" size={32} />
                  <p className="text-sm">لا توجد نتائج</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-6 text-center">
          <MessageCircle className="mx-auto text-blue-600 mb-2" size={32} />
          <p className="text-2xl font-bold text-blue-900">{conversations.length}</p>
          <p className="text-gray-600">محادثة نشطة</p>
        </div>
        
        <div className="bg-green-50 rounded-xl p-6 text-center">
          <Users className="mx-auto text-green-600 mb-2" size={32} />
          <p className="text-2xl font-bold text-green-900">{students.length}</p>
          <p className="text-gray-600">إجمالي الطلاب</p>
        </div>
        
        <div className="bg-yellow-50 rounded-xl p-6 text-center">
          <Clock className="mx-auto text-yellow-600 mb-2" size={32} />
          <p className="text-2xl font-bold text-yellow-900">
            {conversations.reduce((total, conv) => total + conv.unreadCount, 0)}
          </p>
          <p className="text-gray-600">رسالة غير مقروءة</p>
        </div>
      </div>
    </div>
  );
};

export default AdminChat;