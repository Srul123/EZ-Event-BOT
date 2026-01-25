export function replyYesConfirmed({
  guestName,
  headcount,
}: {
  guestName: string;
  headcount: number;
}): string {
  return `תודה ${guestName}! נרשמת ${headcount} אנשים.`;
}

export function replyAskHeadcount({ guestName }: { guestName: string }): string {
  return `${guestName}, כמה אנשים יגיעו?`;
}

export function replyNo({ guestName }: { guestName: string }): string {
  return `תודה ${guestName}, נשמח לראות אותך בפעם הבאה.`;
}

export function replyMaybe({ guestName }: { guestName: string }): string {
  return `הבנתי, תודה. תעדכן אותי כשיהיה ברור.`;
}

export function replyClarify({ guestName }: { guestName: string }): string {
  return `${guestName}, אנא ענה כן/לא/אולי.`;
}

export function replyAlreadyRecorded({
  guestName,
  rsvpStatus,
  headcount,
}: {
  guestName: string;
  rsvpStatus: string;
  headcount?: number | null;
}): string {
  if (rsvpStatus === 'YES') {
    if (headcount) {
      return `תודה ${guestName}! כבר נרשמת ${headcount} אנשים.`;
    }
    return `תודה ${guestName}! כבר נרשמת.`;
  }
  if (rsvpStatus === 'NO') {
    return `תודה ${guestName}, הבנתי שלא תוכל להגיע.`;
  }
  return `תודה ${guestName}!`;
}
