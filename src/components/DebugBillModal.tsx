import React, { useState } from 'react';
import { BillData } from '../types/bill';
import { openaiService } from '../services/openaiService';
import { billExtractionService } from '../services/billExtractionService';

interface DebugBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBillExtracted: (billData: BillData) => void;
  propertyAddresses?: string[];
}

export const DebugBillModal: React.FC<DebugBillModalProps> = ({
  isOpen,
  onClose,
  onBillExtracted,
  propertyAddresses = []
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!imageUrl.trim()) {
      setError('Please enter an image URL');
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      console.log('🔍 Debug extraction - Property addresses:', propertyAddresses);
      console.log('🔍 Debug extraction - Image URL:', imageUrl);
      
      const response = await openaiService.extractBillData({
        imageUrl: imageUrl.trim(),
        propertyAddresses
      });

      if (response.success && response.data) {
        // Save to database
        const saveResponse = await billExtractionService.saveBillExtraction(response.data);
        if (saveResponse.success) {
          console.log('✅ Debug extraction successful:', response.data);
          onBillExtracted(response.data);
          onClose();
          setImageUrl('');
        } else {
          console.error('❌ Failed to save debug bill:', saveResponse.error);
          setError(`Failed to save bill: ${saveResponse.error}`);
        }
      } else {
        console.error('❌ Debug extraction failed:', response.error);
        setError(`Extraction failed: ${response.error}`);
      }
    } catch (error) {
      console.error('❌ Debug extraction error:', error);
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClose = () => {
    setImageUrl('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Debug: Add Bill by URL</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Property Addresses Info */}
          {propertyAddresses.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Property Addresses for Matching:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                {propertyAddresses.map((address, index) => (
                  <li key={index} className="font-mono text-xs">{address}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Image URL Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/bill-image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isExtracting}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isExtracting}
            >
              Cancel
            </button>
            <button
              onClick={handleExtract}
              disabled={isExtracting || !imageUrl.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExtracting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Extracting...</span>
                </div>
              ) : (
                'Extract Bill'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
