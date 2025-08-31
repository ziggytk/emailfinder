// Function to clear all bill extractions
// Run this in the browser console on your utilify.ai page

async function clearAllBillExtractions() {
  try {
    console.log('🗑️ Starting to clear all bill extractions...');
    
    // Get all bill extractions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }

    // Get all bill IDs for the current user
    const { data: bills, error: fetchError } = await supabase
      .from('bill_extractions')
      .select('id')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('❌ Error fetching bills:', fetchError);
      return;
    }

    console.log(`📊 Found ${bills.length} bills to delete`);

    if (bills.length === 0) {
      console.log('✅ No bills to delete');
      return;
    }

    // Delete all bills
    const { error: deleteError } = await supabase
      .from('bill_extractions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Error deleting bills:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${bills.length} bill extractions`);
    
    // Refresh the page to update the UI
    console.log('🔄 Refreshing page...');
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Error clearing bill extractions:', error);
  }
}

// Run the function
clearAllBillExtractions();
