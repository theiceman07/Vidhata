import { SOCIAL_CARD_SIZE, socialCard } from "@/lib/social-card";

export const alt = "Vidhata. AI drafts. Advocates decide.";
export const size = SOCIAL_CARD_SIZE;
export const contentType = "image/png";

export default function Image() {
  return socialCard();
}
