import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
base: '/PM-POSHAN-PRO-V2/',
plugins: [react()],
resolve: {
alias: {
'@': path.resolve(__dirname, '.'),
}
}
})
