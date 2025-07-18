import React, { useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { SearchType } from '../types/email';

interface SearchBarProps {
  searchQuery: string;
  searchType: SearchType;
  onSearchChange: (query: string, type: SearchType) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  searchType,
  onSearchChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const searchOptions = [
    { value: 'all' as SearchType, label: 'All fields' },
    { value: 'from' as SearchType, label: 'From' },
    { value: 'subject' as SearchType, label: 'Subject' },
    { value: 'body' as SearchType, label: 'Body' },
  ];

  const currentOption = searchOptions.find(option => option.value === searchType);

  const handleClear = () => {
    onSearchChange('', searchType);
  };

  return (
    <div className="relative flex items-center bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center pl-4">
        <Search className="w-5 h-5 text-gray-400" />
      </div>
      
      <input
        type="text"
        placeholder="Search emails..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value, searchType)}
        className="flex-1 px-3 py-3 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500"
      />

      {searchQuery && (
        <button
          onClick={handleClear}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-l border-gray-200 transition-colors duration-200"
        >
          <span className="font-medium">{currentOption?.label}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            {searchOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSearchChange(searchQuery, option.value);
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors duration-200 ${
                  option.value === searchType ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                } ${option.value === searchOptions[0].value ? 'rounded-t-lg' : ''} ${
                  option.value === searchOptions[searchOptions.length - 1].value ? 'rounded-b-lg' : ''
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};