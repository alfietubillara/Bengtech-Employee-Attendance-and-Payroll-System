export type Role = "admin" | "manager" | "employee";
export type EmployeeStatus = "Active" | "Inactive";
export type AttendanceStatus =
  | "Present"
  | "Late"
  | "Absent"
  | "Day Off"
  | "Missing Time Out"
  | "Approved Leave"
  | "Half Day Morning"
  | "Half Day Afternoon";
export type PunchType = "time_in" | "time_out";
export type DutyPeriod = "full_day" | "morning_half" | "afternoon_half";

export type Branch = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
};

export type Profile = {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  role: Role;
  branch_id: string | null;
  position: string;
  daily_rate: number;
  required_work_hours_per_day: number;
  contact_number: string | null;
  status: EmployeeStatus;
  profile_photo_path: string | null;
  day_off: number[] | null;
};

export type AttendanceRecord = {
  id: string;
  employee_id: string;
  branch_id: string;
  attendance_date: string;
  time_in_at: string | null;
  time_out_at: string | null;
  time_in_selfie_path: string | null;
  time_out_selfie_path: string | null;
  time_in_selfie_original_path: string | null;
  time_out_selfie_original_path: string | null;
  time_in_latitude: number | null;
  time_in_longitude: number | null;
  time_out_latitude: number | null;
  time_out_longitude: number | null;
  status: AttendanceStatus;
  notes: string | null;
  duty_period: DutyPeriod;
};

export type PayrollRow = {
  employee_id: string;
  employee_name: string;
  branch_name: string;
  daily_rate: number;
  required_work_hours_per_day: number;
  hourly_rate: number;
  present_days: number;
  paid_days: number;
  late_days: number;
  absent_days: number;
  half_days: number;
  total_late_minutes: number;
  total_undertime_minutes: number;
  total_overtime_minutes: number;
  overtime_hours: number;
  basic_pay: number;
  allowance: number;
  bonus_pay: number;
  cash_advance: number;
  other_deductions: number;
  gross_pay: number;
  late_deduction: number;
  undertime_deduction: number;
  absent_deduction: number;
  overtime_pay: number;
  holiday_pay: number;
  total_deductions: number;
  net_salary: number;
};

export type RequestStatus = "Pending" | "Approved" | "Rejected";
export type LeaveType = "Sick Leave" | "Emergency Leave" | "Vacation Leave" | "Unpaid Leave";

export type PayrollPeriod = "first_half" | "second_half";

export type GpsIncident = {
  id: string;
  employee_id: string;
  branch_id: string | null;
  punch_type: PunchType;
  latitude: number;
  longitude: number;
  distance_meters: number | null;
  allowed_radius_meters: number | null;
  attempted_at: string;
  message: string;
};

export type EmployeeDevice = {
  id: string;
  employee_id: string;
  device_id_hash: string;
  device_label: string | null;
  user_agent: string | null;
  registered_at: string;
  last_used_at: string | null;
  reset_requested_at: string | null;
  reset_request_reason: string | null;
};
