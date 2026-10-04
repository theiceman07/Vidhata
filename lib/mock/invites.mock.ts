/**
 * The invitations the preview knows. Empanelment is by invitation, so an
 * advocate reaches onboarding only through a link that carries one of these.
 * There is a valid one and an expired one to walk; any other token is not an
 * invitation at all.
 *
 * The invitee is the preview's own advocate, so completing onboarding leaves
 * them as the advocate the queue already shows.
 */
export interface Invitation {
  token: string;
  name: string;
  email: string;
  /** Prefilled from the invitation, and confirmed by the advocate. */
  barEnrolmentNumber: string;
  stateBarCouncil: string;
  invitedAt: string;
  expiresAt: string;
}

export const VALID_INVITE_TOKEN = "preview-invitation";
export const EXPIRED_INVITE_TOKEN = "expired-invitation";

export const mockInvitations: Invitation[] = [
  {
    token: VALID_INVITE_TOKEN,
    name: "Ananya Rao",
    email: "ananya.rao@example.com",
    barEnrolmentNumber: "MH/2210/2018",
    stateBarCouncil: "Bar Council of Maharashtra and Goa",
    invitedAt: "2026-09-28T09:00:00.000Z",
    expiresAt: "2027-12-31T00:00:00.000Z",
  },
  {
    token: EXPIRED_INVITE_TOKEN,
    name: "Ananya Rao",
    email: "ananya.rao@example.com",
    barEnrolmentNumber: "MH/2210/2018",
    stateBarCouncil: "Bar Council of Maharashtra and Goa",
    invitedAt: "2026-06-01T09:00:00.000Z",
    expiresAt: "2026-06-15T00:00:00.000Z",
  },
];
