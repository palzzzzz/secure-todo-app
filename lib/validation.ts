import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string()
    .email('Email tidak valid')
    .min(5, 'Email minimal 5 karakter')
    .max(100, 'Email maksimal 100 karakter')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Password minimal 8 karakter')
    .max(100, 'Password maksimal 100 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

export const signInSchema = z.object({
  email: z.string()
    .email('Email tidak valid')
    .transform(val => val.toLowerCase().trim()),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const todoSchema = z.object({
  title: z.string()
    .min(1, 'Judul wajib diisi')
    .max(200, 'Judul maksimal 200 karakter')
    .transform(val => val.trim()),
  description: z.string()
    .max(1000, 'Deskripsi maksimal 1000 karakter')
    .optional()
    .transform(val => val?.trim() || null),
});

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }
}

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type TodoInput = z.infer<typeof todoSchema>;