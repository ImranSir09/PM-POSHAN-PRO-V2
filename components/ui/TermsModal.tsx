
import React from 'react';
import Modal from './Modal';
import Button from './Button';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Terms and Conditions" zIndex="z-[60]">
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Compliance Document</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Effective: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                
                <p className="italic text-slate-500">Please review these Terms and Conditions ("Terms") thoroughly before utilizing the PM POSHAN Tracker application. By accessing the application, you agree to be bound by these legal provisions.</p>
                
                <section>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px] text-indigo-600 dark:text-indigo-400">01</span>
                        Acceptance of Agreement
                    </h4>
                    <p>By establishing an account or utilizing any segment of the Service, you acknowledge that you have read, understood, and agreed to these Terms. If you represent an educational institution, you warrant that you possess the authority to bind such institution to these Provisions.</p>
                </section>

                <section>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px] text-indigo-600 dark:text-indigo-400">02</span>
                        Service Scope & Purpose
                    </h4>
                    <p>The PM POSHAN Tracker is a specialized administrative utility designed to facilitate record-keeping for the PM-POSHAN (Mid-Day Meal) scheme. It is an independent tool and is not officially affiliated with any government department, though it aims to assist in generating compliant documentation.</p>
                </section>
                
                <section>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px] text-indigo-600 dark:text-indigo-400">03</span>
                        Data Privacy & Hybrid Storage
                    </h4>
                    <div className="space-y-3">
                        <p>
                            <strong>Local-First Principle:</strong> Primary data storage occurs on your local device's secure storage. The developer does not maintain persistent access to your local records.
                        </p>
                        <p>
                            <strong>Cloud Synchronization:</strong> If you utilize the "Cloud Backup" feature, your data is encrypted and transmitted to a secure Supabase database instance. This data is indexed via your school's unique UDISE code and is used strictly for multi-device synchronization and disaster recovery purposes.
                        </p>
                    </div>
                </section>

                <section>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px] text-indigo-600 dark:text-indigo-400">04</span>
                        Authentication & Security
                    </h4>
                    <p>You bear sole responsibility for the confidentiality of your credentials. In the event of a security breach or unauthorized access, the application provides recovery mechanisms through security questions. Maintain these secondary credentials with the highest level of security.</p>
                </section>

                <section>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px] text-indigo-600 dark:text-indigo-400">05</span>
                        Data Integrity & Reporting
                    </h4>
                    <p>The application facilitates mathematical computations and report generation based on user-provided inputs. Users are advised to cross-verify all generated reports against physical registers. The developer assumes no liability for discrepancies arising from erroneous data entry.</p>
                </section>

                <section>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px] text-indigo-600 dark:text-indigo-400">06</span>
                        Warranty Disclaimer
                    </h4>
                    <p>This software is provided "AS IS" without express or implied warranties. While we strive for 100% uptime and accuracy, we cannot guarantee that the Service will always be uninterrupted or error-free. Regular backups remain a critical user responsibility.</p>
                </section>
                
                <section>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px] text-indigo-600 dark:text-indigo-400">07</span>
                        Intellectual Property
                    </h4>
                    <p>All software architecture, design elements, and functionality are the intellectual property of the developer. Unauthorized redistribution, reverse engineering, or commercial exploitation is strictly prohibited.</p>
                </section>

                <section className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">Contact & Inquiries</h4>
                    <p className="text-xs">For legal inquiries or technical assistance, please coordinate via the official communication channels listed in the Help section of the application interface.</p>
                </section>
            </div>
            <div className="mt-6 flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
                <Button onClick={onClose}>I Understand & Agree</Button>
            </div>
        </Modal>
    );
};

export default TermsModal;
