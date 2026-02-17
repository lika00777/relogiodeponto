export interface Profile {
  id: string;
  full_name: string;
  role: string;
  face_embedding: number[] | null;
  avatar_url?: string | null;
  work_start?: string;
  work_end?: string;
  punch_method?: 'face' | 'pin' | 'both';
  pin_code?: string | null;
  calendar_color?: string;
}

export interface NewEmployeeData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  work_start: string;
  work_end: string;
}
