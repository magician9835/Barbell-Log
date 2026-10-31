import {copyFileSync,mkdirSync} from 'node:fs';
mkdirSync('vendor',{recursive:true});
copyFileSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js','vendor/supabase-2.118.0.js');
copyFileSync('node_modules/@supabase/supabase-js/LICENSE','vendor/SUPABASE-LICENSE');
