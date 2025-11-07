// 'use client';

// import { motion } from 'motion/react';
// import { Button } from './ui/button';
// import { ChatRequestOptions, CreateMessage, Message } from 'ai';
// import { memo } from 'react';

// interface SuggestedActionsProps {
//   chatId: string;
//   append: (
//     message: Message | CreateMessage,
//     chatRequestOptions?: ChatRequestOptions
//   ) => Promise<string | null | undefined>;
// }

// function PureSuggestedActions({ chatId, append }: SuggestedActionsProps) {
//   const suggestedActions = process.env.NEXT_PUBLIC_SG_QUESTIONS?.split('$').map((question: string) => ({
//     title: question,
//   })) || [];

//   return (
//     <>
//       <p className='mb-3 px-3' style={{ fontWeight: '500' }}>SUGGESTED QUESTIONS</p>
//       <div className="flex  flex-col w-full" style={{ alignItems: 'flex-start' }}>
//         {suggestedActions.map((suggestedAction, index) => (
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: 20 }}
//             transition={{ delay: 0.05 * index }}
//             key={`suggested-action-${suggestedAction.title}-${index}`}
//             className={`block`}
//           >

//             <Button
//               variant="ghost"
//               onClick={(e) => {
//                 e?.preventDefault()
//                 append({
//                   role: 'user',
//                   content: suggestedAction?.title,
//                 });
//               }}
//               className="text-left text-sm px-3 my-0 sm:flex-col w-full h-auto justify-start items-start"
//               style={{ paddingTop: '0.3rem', paddingBottom: '0.3rem' }}
//             >
//               <span className='text-sm' style={{ fontWeight: '400' }}>{suggestedAction.title}</span>
//             </Button>

//           </motion.div>
//         ))}
//       </div>
//     </>

//   );
// }

// export const SuggestedActions = memo(PureSuggestedActions, () => true);
