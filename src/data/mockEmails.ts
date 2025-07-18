import { Email } from '../types/email';

export const mockEmails: Email[] = [
  {
    id: '1',
    from: { name: 'Sarah Johnson', email: 'sarah.johnson@company.com' },
    subject: 'Q4 Budget Review Meeting',
    preview: 'Hi team, I wanted to schedule our quarterly budget review meeting for next week. Please let me know your availability for Tuesday or Wednesday afternoon.',
    body: 'Hi team, I wanted to schedule our quarterly budget review meeting for next week. Please let me know your availability for Tuesday or Wednesday afternoon. We need to go over the expenses from this quarter and plan for the next one. The meeting should take about 2 hours.',
    date: new Date('2024-01-15T10:30:00'),
    read: false,
    starred: true
  },
  {
    id: '2',
    from: { name: 'GitHub', email: 'noreply@github.com' },
    subject: '[GitHub] Security alert: New sign-in detected',
    preview: 'We detected a new sign-in to your GitHub account from a new device or location.',
    body: 'We detected a new sign-in to your GitHub account from a new device or location. If this was you, you can safely ignore this email. If not, please secure your account immediately.',
    date: new Date('2024-01-15T09:15:00'),
    read: true,
    starred: false
  },
  {
    id: '3',
    from: { name: 'Michael Chen', email: 'mchen@techstartup.io' },
    subject: 'Partnership Proposal - TechStartup.io',
    preview: 'Hello! I hope this email finds you well. I am reaching out regarding a potential partnership opportunity between our companies.',
    body: 'Hello! I hope this email finds you well. I am reaching out regarding a potential partnership opportunity between our companies. We have been following your work and believe there could be great synergy between our teams.',
    date: new Date('2024-01-15T08:45:00'),
    read: false,
    starred: false
  },
  {
    id: '4',
    from: { name: 'Netflix', email: 'info@netflix.com' },
    subject: 'New shows added to your list',
    preview: 'Check out these new releases we think you\'ll love based on your viewing history.',
    body: 'Check out these new releases we think you\'ll love based on your viewing history. We\'ve added some exciting new series and documentaries that match your interests.',
    date: new Date('2024-01-14T20:30:00'),
    read: true,
    starred: false
  },
  {
    id: '5',
    from: { name: 'Emma Watson', email: 'emma.watson@design.studio' },
    subject: 'Design System Update v2.1',
    preview: 'The latest version of our design system is now available with new components and updated guidelines.',
    body: 'The latest version of our design system is now available with new components and updated guidelines. This update includes new button variants, improved color tokens, and enhanced accessibility features.',
    date: new Date('2024-01-14T16:20:00'),
    read: false,
    starred: true
  },
  {
    id: '6',
    from: { name: 'Amazon', email: 'shipment-tracking@amazon.com' },
    subject: 'Your package has been delivered',
    preview: 'Good news! Your recent Amazon order has been successfully delivered to your address.',
    body: 'Good news! Your recent Amazon order has been successfully delivered to your address. The package was left at your front door as requested. Thank you for shopping with Amazon!',
    date: new Date('2024-01-14T14:10:00'),
    read: true,
    starred: false
  },
  {
    id: '7',
    from: { name: 'David Rodriguez', email: 'david.r@marketing.pro' },
    subject: 'Campaign Performance Report - January',
    preview: 'Please find attached the performance report for our January marketing campaigns.',
    body: 'Please find attached the performance report for our January marketing campaigns. Overall, we saw a 23% increase in engagement compared to last month, with particularly strong performance in our social media campaigns.',
    date: new Date('2024-01-14T11:55:00'),
    read: false,
    starred: false
  },
  {
    id: '8',
    from: { name: 'LinkedIn', email: 'notifications@linkedin.com' },
    subject: 'You have 5 new connection requests',
    preview: 'People are interested in connecting with you on LinkedIn. View and respond to your connection requests.',
    body: 'People are interested in connecting with you on LinkedIn. View and respond to your connection requests. Building your professional network can help you discover new opportunities.',
    date: new Date('2024-01-14T09:30:00'),
    read: true,
    starred: false
  },
  {
    id: '9',
    from: { name: 'Anna Kowalski', email: 'anna.k@consultancy.biz' },
    subject: 'Project Timeline Review',
    preview: 'I wanted to touch base regarding the project timeline we discussed last week.',
    body: 'I wanted to touch base regarding the project timeline we discussed last week. Based on the recent client feedback, we may need to adjust some of our milestones. Could we schedule a call to discuss this further?',
    date: new Date('2024-01-13T15:45:00'),
    read: false,
    starred: true
  },
  {
    id: '10',
    from: { name: 'Spotify', email: 'playlists@spotify.com' },
    subject: 'Your Discover Weekly is ready',
    preview: 'We\'ve created a new playlist with songs we think you\'ll love. Check out this week\'s Discover Weekly.',
    body: 'We\'ve created a new playlist with songs we think you\'ll love. Check out this week\'s Discover Weekly playlist, featuring 30 new tracks curated just for you based on your listening habits.',
    date: new Date('2024-01-13T12:00:00'),
    read: true,
    starred: false
  }
];

// Generate additional mock emails to reach 50
const generateMoreEmails = (): Email[] => {
  const senders = [
    { name: 'Alex Thompson', email: 'alex.thompson@corp.com' },
    { name: 'Lisa Park', email: 'lisa.park@agency.co' },
    { name: 'Robert Smith', email: 'robert.smith@company.org' },
    { name: 'Maria Garcia', email: 'maria.garcia@business.net' },
    { name: 'John Kim', email: 'john.kim@enterprise.io' },
    { name: 'Sophie Miller', email: 'sophie.miller@studio.design' },
    { name: 'Carlos Mendez', email: 'carlos.mendez@solutions.com' },
    { name: 'Jennifer Lee', email: 'jennifer.lee@innovation.tech' }
  ];

  const subjects = [
    'Weekly Status Update',
    'Meeting Reschedule Request',
    'Invoice #12345 - Payment Due',
    'Product Launch Planning',
    'Team Building Event',
    'Quarterly Performance Review',
    'New Feature Announcement',
    'Security Policy Update',
    'Training Session Invitation',
    'Budget Approval Request',
    'Client Feedback Summary',
    'System Maintenance Notice',
    'Holiday Schedule Announcement',
    'Project Milestone Achieved',
    'Code Review Required'
  ];

  const previews = [
    'I hope this email finds you well. I wanted to update you on the current status of our project.',
    'Due to an unexpected conflict, I need to reschedule our meeting originally planned for tomorrow.',
    'This is a friendly reminder that your invoice is due for payment within the next 5 business days.',
    'The product launch is approaching quickly, and we need to finalize all the details for next month.',
    'We\'re organizing a team building event for next Friday. Please confirm your attendance.',
    'It\'s time for your quarterly performance review. Please prepare your self-assessment document.',
    'We\'re excited to announce a new feature that will significantly improve user experience.',
    'Please review the updated security policy and confirm that you understand the new requirements.',
    'You\'re invited to attend a training session on our new project management tools.',
    'Your budget proposal has been reviewed and we need to discuss a few adjustments.',
    'We\'ve compiled feedback from our recent client survey and wanted to share the insights.',
    'Scheduled system maintenance will occur this weekend. Please plan accordingly.',
    'Please note the updated holiday schedule for the remainder of the year.',
    'Congratulations! We\'ve successfully reached an important milestone in our project.',
    'Your recent code changes need to be reviewed before they can be merged into the main branch.'
  ];

  const additionalEmails: Email[] = [];
  let emailId = 11;

  for (let i = 0; i < 40; i++) {
    const sender = senders[i % senders.length];
    const subject = subjects[i % subjects.length];
    const preview = previews[i % previews.length];
    const hoursAgo = Math.floor(Math.random() * 168) + 1; // Random hours in the last week
    
    additionalEmails.push({
      id: emailId.toString(),
      from: sender,
      subject: `${subject} ${Math.floor(i / subjects.length) > 0 ? `(${Math.floor(i / subjects.length) + 1})` : ''}`,
      preview,
      body: `${preview} This is the full body of the email with additional details and context that would typically be found in a real email message.`,
      date: new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)),
      read: Math.random() > 0.4,
      starred: Math.random() > 0.8
    });
    
    emailId++;
  }

  return additionalEmails;
};

export const allMockEmails = [...mockEmails, ...generateMoreEmails()];