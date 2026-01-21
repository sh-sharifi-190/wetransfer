// pages/api/oauth/available.ts
import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // لیست پلتفرم‌های احراز هویت فعال
  const availableProviders = ["google"]; // می‌تونی اینا رو برمی‌زنی یا اضافه کنی

  return res.status(200).json({ providers: availableProviders });
}
