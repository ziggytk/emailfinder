import React, { useState } from 'react';
import { openaiService } from '../services/openaiService';
import { billExtractionService } from '../services/billExtractionService';
import { BillData } from '../types/bill';

interface BillExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBillExtracted: (billData: BillData) => void;
  propertyAddresses?: string[];
}

export const BillExtractionModal: React.FC<BillExtractionModalProps> = ({
  isOpen,
  onClose,
  onBillExtracted,
  propertyAddresses = []
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<BillData | null>(null);

  const handleExtract = async () => {
    if (!imageUrl.trim()) {
      setError('Please enter an image URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      console.log('🔍 Modal extraction - Property addresses:', propertyAddresses);
      const response = await openaiService.extractBillData({ 
        imageUrl: imageUrl.trim(),
        propertyAddresses 
      });

      if (response.success && response.data) {
        setExtractedData(response.data);
        onBillExtracted(response.data);
      } else {
        setError(response.error || 'Failed to extract bill data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (extractedData) {
      try {
        const response = await billExtractionService.saveBillExtraction(extractedData);
        if (response.success) {
          onBillExtracted(extractedData);
          onClose();
        } else {
          setError(response.error || 'Failed to save bill data');
        }
      } catch (error) {
        setError('Failed to save bill data to database');
      }
    }
  };

  const handleClose = () => {
    setImageUrl('');
    setError(null);
    setExtractedData(null);
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Extract Bill Data from Image
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Image URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/bill-image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Extract Button */}
          <button
            onClick={handleExtract}
            disabled={isLoading || !imageUrl.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Extracting...' : 'Extract Bill Data'}
          </button>

          {/* Extracted Data Display */}
          {extractedData && (
            <div className="border border-gray-200 rounded-md p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                Extracted Bill Data
              </h3>
              
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-600">Owner Name</label>
                   <p className="text-gray-800">{extractedData.ownerName}</p>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-600">Account Number</label>
                   <p className="text-gray-800">{extractedData.accountNumber}</p>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-600">Home Address</label>
                   <p className="text-gray-800">{extractedData.homeAddress}</p>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-600">Confidence Score</label>
                   <p className={`text-sm font-semibold ${
                     extractedData.confidenceScore >= 90 ? 'text-green-600' : 
                     extractedData.confidenceScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                   }`}>
                     {extractedData.confidenceScore}%
                   </p>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-600">Bill Due Date</label>
                   <p className="text-gray-800">{extractedData.billDueDate}</p>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-600">Auto Pay Enabled</label>
                   <p className="text-gray-800">{extractedData.isAutoPayEnabled ? 'Yes' : 'No'}</p>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-600">Daily Electric Usage (kWh)</label>
                   <p className="text-gray-800">{extractedData.averageDailyElectricUsage}</p>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-600">Next Billing Date</label>
                   <p className="text-gray-800">{extractedData.nextBillingDate}</p>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-600">Billing Period</label>
                   <p className="text-gray-800">
                     {extractedData.billingPeriodStart} to {extractedData.billingPeriodEnd}
                   </p>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-600">Billing Days</label>
                   <p className="text-gray-800">{extractedData.billingDays}</p>
                 </div>
                 
                 <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-600">Total Amount Due</label>
                   <p className="text-gray-800 text-lg font-semibold">
                     ${extractedData.totalAmountDue.toFixed(2)}
                   </p>
                 </div>
               </div>

              <div className="mt-4 flex space-x-3">
                <button
                  onClick={handleSave}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                >
                  Save Bill Data
                </button>
                <button
                  onClick={() => setExtractedData(null)}
                  className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                >
                  Extract Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
