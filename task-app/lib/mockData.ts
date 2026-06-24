import { Youtube, Calendar, Smartphone, MessageSquare, Users, BookOpen, Gift, CreditCard, Bell, Package } from 'lucide-react-native';

export type Task = {
  id: string;
  title: string;
  subtitle: string;
  reward: number;
  category: 'video' | 'checkin' | 'install' | 'survey' | 'refer' | 'read';
  description?: string;
  steps?: string[];
  notes?: string[];
  tag?: 'trending' | 'high' | 'bonus';
};

export const mockTasks: Task[] = [
  {
    id: '1', title: 'Watch YouTube Video', subtitle: 'Watch a video for 60 sec',
    reward: 5, category: 'video', tag: 'trending',
    description: 'Watch the YouTube video for at least 60 seconds and earn reward instantly.',
    steps: ['Click on Start Task', 'Watch the video for 60 seconds', 'Click on Submit', 'Get your reward'],
    notes: ["Don't skip the video", 'Make sure you watch complete 60 sec', 'Only one attempt per day'],
  },
  { id: '2', title: 'Daily Check-in', subtitle: 'Check-in daily and earn', reward: 2, category: 'checkin' },
  { id: '3', title: 'Install & Open App', subtitle: 'Install & open any app', reward: 10, category: 'install', tag: 'high' },
  { id: '4', title: 'Complete Survey', subtitle: 'Complete survey and earn', reward: 15, category: 'survey', tag: 'high' },
  { id: '5', title: 'Refer & Earn', subtitle: 'Invite friends and earn', reward: 20, category: 'refer', tag: 'bonus' },
  { id: '6', title: 'Read Articles', subtitle: 'Read article for 30 sec', reward: 3, category: 'read' },
];

export const taskIconMap: Record<Task['category'], { Icon: any; bg: string; color: string }> = {
  video: { Icon: Youtube, bg: '#FEE2E2', color: '#EF4444' },
  checkin: { Icon: Calendar, bg: '#DBEAFE', color: '#2D6BFF' },
  install: { Icon: Smartphone, bg: '#DCFCE7', color: '#22C55E' },
  survey: { Icon: MessageSquare, bg: '#F3E8FF', color: '#8B5CF6' },
  refer: { Icon: Users, bg: '#FFEDD5', color: '#F97316' },
  read: { Icon: BookOpen, bg: '#DBEAFE', color: '#2D6BFF' },
};

export type Transaction = {
  id: string;
  type: 'credit' | 'debit';
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  status: 'Success' | 'Pending' | 'Failed';
  icon: 'task' | 'survey' | 'withdraw' | 'refer' | 'read';
};

export const mockTransactions: Transaction[] = [
  { id: 't1', type: 'credit', title: 'Task Reward', subtitle: 'Watch YouTube Video', amount: 5, date: '20 May 2024, 10:30 AM', status: 'Success', icon: 'task' },
  { id: 't2', type: 'credit', title: 'Survey Reward', subtitle: 'Complete Survey', amount: 15, date: '20 May 2024, 09:15 AM', status: 'Success', icon: 'survey' },
  { id: 't3', type: 'debit', title: 'Withdraw to UPI', subtitle: 'rahul@upi', amount: 200, date: '19 May 2024, 08:45 PM', status: 'Success', icon: 'withdraw' },
  { id: 't4', type: 'credit', title: 'Refer Reward', subtitle: 'Referral Bonus', amount: 20, date: '19 May 2024, 06:20 PM', status: 'Success', icon: 'refer' },
  { id: 't5', type: 'credit', title: 'Task Reward', subtitle: 'Read Article', amount: 3, date: '18 May 2024, 11:10 AM', status: 'Success', icon: 'read' },
];

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'earn' | 'withdraw' | 'task' | 'refer';
};

export const mockNotifications: AppNotification[] = [
  { id: 'n1', title: 'You earned ₹5.00', message: 'for Watching Video', time: '2 min ago', type: 'earn' },
  { id: 'n2', title: 'You earned ₹15.00', message: 'for Completing Survey', time: '10 min ago', type: 'earn' },
  { id: 'n3', title: '₹200.00 Withdraw Success', message: 'to rahul@upi', time: '1 day ago', type: 'withdraw' },
  { id: 'n4', title: 'New Task Available', message: 'Check new tasks and earn', time: '2 days ago', type: 'task' },
  { id: 'n5', title: 'Refer Bonus ₹20.00', message: 'You earned referral bonus', time: '3 days ago', type: 'refer' },
];

export const user = {
  name: 'Rahul Kumar',
  email: 'rahulkumar@gmail.com',
  phone: '+91 9876543210',
  referralCode: 'RAHUL1234',
  totalReferrals: 120,
  referralEarnings: 2400,
  balance: 1250.5,
  todayEarnings: 120.5,
  totalPoints: 8450,
  kycVerified: true,
};
