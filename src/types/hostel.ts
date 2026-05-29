export interface HostelInfo {
  blockName: string;
  roomNumber: string;
  gender: string;
  messType: string;
  isHosteller: boolean;
}

export interface LeaveRequest {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedOn: string;
}

export interface MessSchedule {
  day: string;
  breakfast: string[];
  lunch: string[];
  snacks: string[];
  dinner: string[];
}

export interface LaundrySchedule {
  block: string;
  days: string[];
  timing: string;
}
