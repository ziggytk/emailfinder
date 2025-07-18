import React from 'react';
import { Star, Mail, MailOpen, Loader2 } from 'lucide-react';
import { ParsedEmail } from '../services/gmailApi';

interface EmailListProps {
  emails: ParsedEmail[];
  selectedEmails: Set<string>;
  onEmailSelect: (emailId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isLoading?: boolean;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmails,
  onEmailSelect,
  onSelectAll,
  onDeselectAll,
  isLoading = false,
}) => {
  const formatDate = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const emailDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (emailDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (emailDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const allSelected = emails.length > 0 && selectedEmails.size === emails.length;
  const someSelected = selectedEmails.size > 0 && selectedEmails.size < emails.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={allSelected ? onDeselectAll : onSelectAll}
              disabled={isLoading}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
            />
            {someSelected && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>
              </div>
            )}
          </div>
          
          {selectedEmails.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 font-medium">
                {selectedEmails.size} selected
              </span>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          {emails.length} messages
        </div>
      </div>

      {/* Email list */}
      <div className="divide-y divide-gray-100">
        {emails.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No emails found</p>
            {isLoading && (
              <div className="flex items-center justify-center mt-4">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" />
                <span className="text-sm text-gray-400">Loading emails...</span>
              </div>
            )}
          </div>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              className={`flex items-center p-4 hover:bg-gray-50 transition-colors duration-200 ${
                selectedEmails.has(email.id) ? 'bg-blue-50' : ''
              } ${!email.read ? 'bg-blue-25' : ''}`}
            >
              <div className="flex items-center space-x-4 flex-1">
                <input
                  type="checkbox"
                  checked={selectedEmails.has(email.id)}
                  onChange={() => onEmailSelect(email.id)}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                />
                
                <div className="flex items-center space-x-2">
                  {email.starred && (
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  )}
                  {email.read ? (
                    <MailOpen className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Mail className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3 truncate">
                    <span className={`text-sm ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {email.from.name}
                    </span>
                  </div>
                  
                  <div className="col-span-7 min-w-0">
                    <div className="truncate">
                      <span className={`text-sm ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {email.subject}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        — {email.preview}
                      </span>
                    </div>
                  </div>
                  
                  <div className="col-span-2 text-right">
                    <span className={`text-xs ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      {formatDate(email.date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};