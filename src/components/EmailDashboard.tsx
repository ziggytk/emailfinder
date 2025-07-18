import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './Header';
import { SearchBar } from './SearchBar';
import { EmailList } from './EmailList';
import { gmailApiService, ParsedEmail } from '../services/gmailApi';
import { User, SearchType } from '../types/email';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface EmailDashboardProps {
  user: User;
  onLogout: () => void;
}

export const EmailDashboard: React.FC<EmailDashboardProps> = ({ user, onLogout }) => {
  const [emails, setEmails] = useState<ParsedEmail[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load emails on component mount
  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading emails...');
      const fetchedEmails = await gmailApiService.getMessages(50);
      console.log('Emails loaded:', fetchedEmails.length);
      setEmails(fetchedEmails);
    } catch (error) {
      console.error('Error loading emails:', error);
      setError('Failed to load emails. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshEmails = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const fetchedEmails = await gmailApiService.getMessages(50);
      setEmails(fetchedEmails);
    } catch (error) {
      console.error('Error refreshing emails:', error);
      setError('Failed to refresh emails. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter emails based on search (client-side filtering for now)
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails;

    const query = searchQuery.toLowerCase();
    
    return emails.filter(email => {
      switch (searchType) {
        case 'from':
          return email.from.name.toLowerCase().includes(query) || 
                 email.from.email.toLowerCase().includes(query);
        case 'subject':
          return email.subject.toLowerCase().includes(query);
        case 'body':
          return email.body.toLowerCase().includes(query);
        case 'all':
        default:
          return email.from.name.toLowerCase().includes(query) ||
                 email.from.email.toLowerCase().includes(query) ||
                 email.subject.toLowerCase().includes(query) ||
                 email.body.toLowerCase().includes(query);
      }
    });
  }, [emails, searchQuery, searchType]);

  const handleEmailSelect = (emailId: string) => {
    const newSelected = new Set(selectedEmails);
    
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    
    setSelectedEmails(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedEmails(new Set(filteredEmails.map(email => email.id)));
  };

  const handleDeselectAll = () => {
    setSelectedEmails(new Set());
  };

  const handleSearchChange = async (query: string, type: SearchType) => {
    setSearchQuery(query);
    setSearchType(type);
    setSelectedEmails(new Set()); // Clear selection when search changes
  };

  const handleLogout = () => {
    onLogout();
  };

  if (isLoading && emails.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading your emails</h2>
          <p className="text-gray-600">Please wait while we fetch your Gmail messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 font-medium">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-sm text-red-600 hover:text-red-800 mt-2 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Inbox</h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredEmails.length} of {emails.length} messages
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
            
            <button
              onClick={refreshEmails}
              disabled={isRefreshing}
              className="mt-4 sm:mt-0 inline-flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="max-w-2xl">
            <SearchBar
              searchQuery={searchQuery}
              searchType={searchType}
              onSearchChange={handleSearchChange}
            />
          </div>

          <EmailList
            emails={filteredEmails}
            selectedEmails={selectedEmails}
            onEmailSelect={handleEmailSelect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  );
};