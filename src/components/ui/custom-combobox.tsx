// 'use client';

// import { useState } from 'react';
// import { Combobox } from '@/components/ui/combobox';

// export default function CustomCombobox() {
//   const [query, setQuery] = useState('');
//   const items = ['Apple', 'Banana', 'Cherry', 'Date', 'Grapes'];

//   // Filter the items based on the search query
//   const filteredItems = query === ''
//     ? items
//     : items.filter(item =>
//         item.toLowerCase().includes(query.toLowerCase())
//       );

//   return (
//     <div className="flex items-center space-x-2">
//       {/* Search Field */}
//       <input
//         type="text"
//         placeholder="Search..."
//         value={query}
//         onChange={e => setQuery(e.target.value)}
//         className="border px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//       />

//       {/* Combobox Select */}
//       <Combobox>
//         <Combobox.Trigger className="border px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
//           Select Item
//         </Combobox.Trigger>
//         <Combobox.Content>
//           {filteredItems.length > 0 ? (
//             filteredItems.map(item => (
//               <Combobox.Item key={item} value={item}>
//                 {item}
//               </Combobox.Item>
//             ))
//           ) : (
//             <Combobox.Item disabled>No results found</Combobox.Item>
//           )}
//         </Combobox.Content>
//       </Combobox>
//     </div>
//   );
// }
