import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
base: '/PM-POSHAN-PRO-V2/',
plugins: [react()],
resolve: {
alias: {
'@': '/src',
},
},
});
