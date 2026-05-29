import { z } from "@damatjs/deps/zod";

export const UserOnboardingInputSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  password: z.string().min(8),
  metadata: z.any().optional(),
}).strict();

export type UserOnboardingInput = z.infer<typeof UserOnboardingInputSchema>;

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface WelcomeEmailResult {
  sent: boolean;
  emailId: string;
}

export interface UserSettings {
  userId: string;
  theme: "light" | "dark" | "system";
  notifications: boolean;
  language: string;
}

export interface UserOnboardingResult {
  user: UserProfile;
  emailSent: boolean;
  settings: UserSettings;
}
