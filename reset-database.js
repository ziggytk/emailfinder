// JavaScript function to clear bill data via Supabase client
// Run this in your browser console after importing the Supabase client

async function clearAllBillData() {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('User not authenticated');
      return;
    }

    console.log('Clearing bill data for user:', user.email);

    // Delete all bill extractions for the current user
    const { error: deleteError } = await supabase
      .from('bill_extractions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting bill extractions:', deleteError);
      return;
    }

    console.log('✅ Successfully cleared all bill data');
    
    // Refresh the page to see the changes
    window.location.reload();
    
  } catch (error) {
    console.error('Error clearing bill data:', error);
  }
}

// Run the function
clearAllBillData();
