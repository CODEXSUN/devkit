export type MessengerMessage = {
  actorId: string;
  body: string;
  client: "desktop" | "mobile" | "web";
  createdAt: string;
  uuid: string;
};

export type MessengerEvent = { actorId: string; message: MessengerMessage };
