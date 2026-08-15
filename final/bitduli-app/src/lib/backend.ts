import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { FeelingType } from "../types";

type DrawingPayload = {
  diaryText: string;
  profileColorHex: string;
  profileColorName: string;
  feeling: FeelingType;
};

type SummaryPayload = {
  diaryText: string;
  feeling: FeelingType;
};

export async function generateDiaryDrawing(payload: DrawingPayload) {
  const callable = httpsCallable<DrawingPayload, { imageBase64?: string; imageDataUrl?: string; mimeType?: string; isMock?: boolean }>(functions, "generateDiaryDrawing");
  const result = await callable(payload);
  return result.data;
}

export async function summarizeDiary(payload: SummaryPayload) {
  const callable = httpsCallable<SummaryPayload, { summary: string; isMock?: boolean }>(functions, "summarizeDiary");
  const result = await callable(payload);
  return result.data;
}

export async function sendFriendRequest(targetEmail: string) {
  const callable = httpsCallable<{ targetEmail: string }, { ok: true; friendNickname: string }>(functions, "sendFriendRequest");
  const result = await callable({ targetEmail });
  return result.data;
}

export async function acceptFriendRequest(targetEmail: string) {
  const callable = httpsCallable<{ targetEmail: string }, { ok: true }>(functions, "acceptFriendRequest");
  const result = await callable({ targetEmail });
  return result.data;
}

export async function declineFriendRequest(targetEmail: string) {
  const callable = httpsCallable<{ targetEmail: string }, { ok: true }>(functions, "declineFriendRequest");
  const result = await callable({ targetEmail });
  return result.data;
}

export async function removeFriend(targetEmail: string) {
  const callable = httpsCallable<{ targetEmail: string }, { ok: true }>(functions, "removeFriend");
  const result = await callable({ targetEmail });
  return result.data;
}
