import React, { useState, useEffect } from 'react';
import { BillData } from '../types/bill';
import { billExtractionService } from '../services/billExtractionService';

interface BillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: BillData | null;
  onApprove?: (id: string, propertyId?: string) => void;
  onReject?: (id: string, comment?: string) => void;
  onDataUpdated?: (updatedBill: BillData) => void;
  propertyAddresses?: string[];
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({
  isOpen,
  onClose,
  bill,
  onApprove,
  onReject,
  onDataUpdated,
  propertyAddresses = []
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<BillData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [rejectionComment, setRejectionComment] = useState<string>('');
  const [newPropertyForm, setNewPropertyForm] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  });

  useEffect(() => {
    if (bill) {
      setEditedData({ ...bill });
      setHasChanges(false);
      setIsEditing(false);
      
      // Generate signed URL for the image
      const loadImage = async () => {
        setImageLoading(true);
        try {
          const result = await billExtractionService.generateImageAccessToken(bill.imageUrl);
          if (result.success && result.url) {
            setImageUrl(result.url);
          } else {
            console.error('Failed to generate image access token:', result.error);
            setImageUrl(bill.imageUrl); // Fallback to original URL
          }
        } catch (error) {
          console.error('Error loading image:', error);
          setImageUrl(bill.imageUrl); // Fallback to original URL
        } finally {
          setImageLoading(false);
        }
      };
      
      loadImage();
    }
  }, [bill]);

  if (!isOpen || !bill || !editedData) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleApprove = () => {
    setShowApproveModal(true);
    // Reset the new property form
    setNewPropertyForm({
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    });
    setSelectedPropertyId('');
  };

  const handleConfirmApprove = () => {
    if (onApprove) {
      let propertyId = selectedPropertyId;
      
      // If creating a new property, format the address properly
      if (selectedPropertyId === 'new') {
        const formattedAddress = `${newPropertyForm.street}, ${newPropertyForm.city}, ${newPropertyForm.state} ${newPropertyForm.zipCode}`;
        propertyId = `new-${formattedAddress}`;
      }
      
      onApprove(bill.id, propertyId);
      
      // Reset the form
      setNewPropertyForm({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      });
      setSelectedPropertyId('');
      
      onClose();
    }
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (onReject) {
      onReject(bill.id, rejectionComment);
      onClose();
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedData({ ...bill });
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (editedData && hasChanges) {
      try {
        // Update the bill data in the database
        const response = await billExtractionService.updateBillExtraction(bill.id, editedData);
        if (response.success) {
          setIsEditing(false);
          setHasChanges(false);
          // Update the local bill data to reflect changes
          const updatedBill = { ...bill, ...editedData, wasEdited: true, updatedAt: new Date().toISOString() };
          Object.assign(bill, updatedBill);
          // Notify parent component of the update
          if (onDataUpdated) {
            onDataUpdated(updatedBill);
          }
        } else {
          console.error('Failed to save changes:', response.error);
          alert('Failed to save changes. Please try again.');
        }
      } catch (error) {
        console.error('Error saving changes:', error);
        alert('Error saving changes. Please try again.');
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleFieldChange = (field: keyof BillData, value: any) => {
    if (editedData) {
      const updated = { ...editedData, [field]: value };
      setEditedData(updated);
      setHasChanges(true);
    }
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Bill Details</h2>
              <p className="text-gray-600">Account: {bill.accountNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Confidence Score Banner */}
          <div className={`mb-6 p-4 rounded-lg border ${
            bill.confidenceScore >= 95 ? 'bg-green-50 border-green-200' : 
            bill.confidenceScore >= 70 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Extraction Confidence</h3>
                <p className="text-sm text-gray-600">
                  {bill.confidenceScore >= 95 ? 'High confidence - Data appears accurate' :
                   bill.confidenceScore >= 70 ? 'Medium confidence - Please review carefully' :
                   'Low confidence - Manual review required'}
                </p>
              </div>
              <div className={`text-2xl font-bold ${
                bill.confidenceScore >= 95 ? 'text-green-600' : 
                bill.confidenceScore >= 70 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {bill.confidenceScore}%
              </div>
            </div>
          </div>

          {/* Property Association Banner */}
          <div className={`mb-6 p-4 rounded-lg border ${
            bill.addressMatchScore >= 75 ? 'bg-green-50 border-green-200' : 
            bill.addressMatchScore >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Property Association</h3>
                <p className="text-sm text-gray-600">
                  {bill.addressMatchScore >= 75 ? 'High confidence - Bill belongs to your property' :
                   bill.addressMatchScore >= 50 ? 'Medium confidence - Bill may belong to your property' :
                   'Low confidence - Bill likely belongs to a different property'}
                </p>
                {bill.matchedPropertyAddress && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Associated with:</span> {bill.matchedPropertyAddress}
                  </p>
                )}
              </div>
              <div className={`text-2xl font-bold ${
                bill.addressMatchScore >= 75 ? 'text-green-600' : 
                bill.addressMatchScore >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {bill.addressMatchScore}%
              </div>
            </div>
          </div>

          {/* Content Layout - Information and Image Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Left Column - Extracted Information */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Extracted Information</h3>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Edit Data
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
              
              {hasChanges && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ You have unsaved changes. Click "Save Changes" to keep your edits.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">Owner Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.ownerName}
                    onChange={(e) => handleFieldChange('ownerName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{editedData.ownerName}</p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">Account Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.accountNumber}
                    onChange={(e) => handleFieldChange('accountNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{editedData.accountNumber}</p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">Home Address</label>
                {isEditing ? (
                  <textarea
                    value={editedData.homeAddress}
                    onChange={(e) => handleFieldChange('homeAddress', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{editedData.homeAddress}</p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">Bill Due Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedData.billDueDate}
                    onChange={(e) => handleFieldChange('billDueDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{formatDate(editedData.billDueDate)}</p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">Auto Pay Enabled</label>
                {isEditing ? (
                  <select
                    value={editedData.isAutoPayEnabled.toString()}
                    onChange={(e) => handleFieldChange('isAutoPayEnabled', e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <p className={`font-medium ${editedData.isAutoPayEnabled ? 'text-green-600' : 'text-red-600'}`}>
                    {editedData.isAutoPayEnabled ? 'Yes' : 'No'}
                  </p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">Daily Electric Usage (kWh)</label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editedData.averageDailyElectricUsage}
                    onChange={(e) => handleFieldChange('averageDailyElectricUsage', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{editedData.averageDailyElectricUsage} kWh</p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">Next Billing Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedData.nextBillingDate}
                    onChange={(e) => handleFieldChange('nextBillingDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{formatDate(editedData.nextBillingDate)}</p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">Billing Period Start</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedData.billingPeriodStart}
                    onChange={(e) => handleFieldChange('billingPeriodStart', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{formatDate(editedData.billingPeriodStart)}</p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">Billing Period End</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedData.billingPeriodEnd}
                    onChange={(e) => handleFieldChange('billingPeriodEnd', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{formatDate(editedData.billingPeriodEnd)}</p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">Billing Days</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.billingDays}
                    onChange={(e) => handleFieldChange('billingDays', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{editedData.billingDays} days</p>
                )}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-blue-600 mb-1">Total Amount Due</label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editedData.totalAmountDue}
                    onChange={(e) => handleFieldChange('totalAmountDue', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  />
                ) : (
                  <p className="text-blue-900 text-xl font-bold">{formatCurrency(editedData.totalAmountDue)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Original Image */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Original Bill Image</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-100 sticky top-4">
              {imageLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading image...</span>
                </div>
              ) : (
                <img 
                  src={imageUrl || bill.imageUrl} 
                  alt="Utility bill" 
                  className="w-full h-auto max-h-[600px] object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K';
                  }}
                />
              )}
            </div>
          </div>
        </div>

                    {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
            
            {onReject && (
              <button
                onClick={handleReject}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Reject
              </button>
            )}
            
            {onApprove && (
              <button
                onClick={handleApprove}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Approve
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Approve Bill</h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Associate with Property
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a property...</option>
                  {propertyAddresses.map((address, index) => (
                    <option key={index} value={`property-${index}`}>
                      {address}
                    </option>
                  ))}
                  <option value="new">Add new property</option>
                </select>
              </div>

              {selectedPropertyId === 'new' && (
                <div className="mb-4 space-y-4">
                  <h4 className="font-medium text-gray-900">New Property Details</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={newPropertyForm.street}
                      onChange={(e) => setNewPropertyForm({...newPropertyForm, street: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="123 Main St"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={newPropertyForm.city}
                        onChange={(e) => setNewPropertyForm({...newPropertyForm, city: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={newPropertyForm.state}
                        onChange={(e) => setNewPropertyForm({...newPropertyForm, state: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="NY"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={newPropertyForm.zipCode}
                      onChange={(e) => setNewPropertyForm({...newPropertyForm, zipCode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="10001"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    // Reset the form
                    setNewPropertyForm({
                      street: '',
                      city: '',
                      state: '',
                      zipCode: '',
                      country: 'USA'
                    });
                    setSelectedPropertyId('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApprove}
                  disabled={selectedPropertyId === 'new' && (!newPropertyForm.street.trim() || !newPropertyForm.city.trim() || !newPropertyForm.state.trim() || !newPropertyForm.zipCode.trim())}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Reject Bill</h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  placeholder="Why are you rejecting this bill?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
