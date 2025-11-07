import { motion } from 'motion/react';
import { CustomCombobox } from './ui/combobox';
import { MultimodalInput } from './multimodal-input';
import { useSearchParams } from 'next/navigation';
import { decryptData } from '@/lib/utils';
import SvgTransition from './chat/logo-animation';
import { colorSvg, monoSvg } from './icons';
import StaticLogo from './chat/static-logo';

export const Overview = (props: any) => {
  const { corpus, setSelectedCorpus, selectedCorpus, append, input, setInput, isLoading, messages, isTextFieldSelected, setIsTextFieldSelected, forceComplete, setForceComplete} = props;
  const searchParams = useSearchParams();
  const encryptedId = searchParams.get("id");
  const id = decryptData(encryptedId);
  return (
    <motion.div
      key="overview"
      className="mx-auto md:mt-20 w-full"
      style={{ maxWidth: '97vw' }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      {/* increase max width here */}
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center w-full mx-auto md:max-w-3xl">
        <StaticLogo />

        <MultimodalInput
          chatId={id}
          input={input}
          setInput={setInput}
          handleSubmit={append}
          isLoading={isLoading}
          messages={messages}
          append={append}
          setIsTextFieldSelected={setIsTextFieldSelected}
          isTextFieldSelected={isTextFieldSelected}
          setForceComplete={setForceComplete}
          isFinished={true}
        />
      </div>
    </motion.div>
  );
};
