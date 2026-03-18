import React from 'react';
import { MoreHorizontal, Network, PlusCircle } from 'lucide-react';
import { motion } from 'motion/react';
import GroupMenu from './GroupMenu';
import { useLanguage } from '../contexts/LanguageContext';

export function GroupCard({ id, name, devices, onOpenSettings, onOpenControl, onDelete, isDeleting = false }) {
    const { t } = useLanguage();
    const [showMenu, setShowMenu] = React.useState(false);
    const group = { id, name, devices };
    const safeDevices = Array.isArray(devices) ? devices : [];
    const openMenu = () => setShowMenu(true);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                onClick={openMenu}
                className="flex h-full cursor-pointer flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
            >
                <div className="flex flex-1 flex-col p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                            <Network size={20} />
                        </div>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                openMenu();
                            }}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 transition-colors"
                        >
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                    <h4 className="text-base font-bold text-slate-800">{name}</h4>


                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap content-start gap-2">
                        {safeDevices.map((device) => {
                            const deviceKey = typeof device === 'string' ? device : device?.id ?? device?.name;
                            const deviceLabel = typeof device === 'string' ? device : device?.name ?? device?.id;

                            return (
                            <span key={deviceKey} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/50">
                                {deviceLabel}
                            </span>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-slate-50 px-5 py-3 flex items-center justify-end border-t border-slate-100">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete?.(event);
                        }}
                        disabled={isDeleting}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isDeleting ? t('common.deleting') : t('groups.deleteGroup')}
                    </button>
                </div>
            </motion.div>
            <GroupMenu
                open={showMenu}
                onClose={() => setShowMenu(false)}
                groupName={name}
                onOpenSettings={() => onOpenSettings?.(group)}
                onOpenControl={() => onOpenControl?.(group)}
            />
        </>
    );
}

// export function GroupCard({ name,    onOpenSettings, onOpenControl }) {
//     const [showMenu, setShowMenu] = React.useState(false);
//     const group = { name };
//
//     return (
//         <>
//             <motion.div
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 whileHover={{ y: -4 }}
//                 className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
//             >
//                 <div className="p-5">
//                     <div className="flex justify-between items-start mb-4">
//                         <div className="size-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
//                             <Network size={20} />
//                         </div>
//                         <button
//                             type="button"
//                             onClick={() => setShowMenu(true)}
//                             className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 transition-colors"
//                         >
//                             <MoreHorizontal size={20} />
//                         </button>
//                     </div>
//                     <h4 className="text-base font-bold text-slate-800">{name}</h4>
//
//
//                     <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
//                         {devices.map(device => (
//                             <span key={device} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/50">
//                                 {device}
//                             </span>
//                         ))}
//                     </div>
//                 </div>
//
//                 <div className="bg-slate-50 px-5 py-3 flex items-center justify-between border-t border-slate-100">
//                     {/*<div className="flex items-center gap-1.5">*/}
//                     {/*    <span className={`size-2 rounded-full ${status === '運行中' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>*/}
//                     {/*    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{status}</span>*/}
//                     {/*</div>*/}
//                     {/*<span className="text-[11px] text-slate-400 font-medium">{created}</span>*/}
//                 </div>
//             </motion.div>
//             <GroupMenu
//                 open={showMenu}
//                 onClose={() => setShowMenu(false)}
//                 groupName={name}
//                 onOpenSettings={() => onOpenSettings?.(group)}
//                 onOpenControl={() => onOpenControl?.(group)}
//             />
//         </>
//     );
// }
export function AddGroupCard({ onClick }) {
    const { t } = useLanguage();

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="h-full min-h-[220px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 opacity-60 hover:opacity-100 transition-all cursor-pointer group bg-white/50 hover:bg-white hover:border-primary/30"
        >
            <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <PlusCircle size={24} className="text-slate-400 group-hover:text-primary" />
            </div>
            <p className="text-sm font-bold text-slate-500 group-hover:text-primary transition-colors">{t('groups.createNew')}</p>
        </motion.div>
    );
}
