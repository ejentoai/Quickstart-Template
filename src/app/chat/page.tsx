import Chat from '@/components/chat/chat';
import { DEFAULT_MODEL_NAME } from '@/lib/ai/models';
import { ConfigGuard } from '@/components/config-guard';

export default async function Page() {

  const selectedModelId = DEFAULT_MODEL_NAME;

  return (
    <ConfigGuard requireConfig={true}>
      <Chat
        initialMessages={[]}
        selectedModelId={selectedModelId}
        selectedVisibilityType="private"
        isReadonly={false}
      />
    </ConfigGuard>
  );
}
