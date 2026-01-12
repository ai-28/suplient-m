import { UniversalChatInterface } from "./UniversalChatInterface";

export default function ClientChatInterface({ clientName, clientInitials, clientType, clientId }) {
  return (
    <UniversalChatInterface
      chatId={clientId}
      chatType={clientType}
      participantName={clientName}
      participantInitials={clientInitials}
      currentUserId="coach1"
      currentUserRole="coach"
      allowScheduling={clientType === "light" || clientType === "group"}
      title={clientName}
    />
  );
}