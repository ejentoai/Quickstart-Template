import Chat from '@/components/chat/chat';
import { DEFAULT_MODEL_NAME } from '@/lib/ai/models';

export default async function Page() {
 

  const selectedModelId = DEFAULT_MODEL_NAME;

  return (
    
    <Chat
      initialMessages={[]}
      selectedModelId={selectedModelId}
      selectedVisibilityType="private"
      isReadonly={false}
    />
    
  );
}
