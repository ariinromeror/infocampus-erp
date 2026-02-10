import { createClient } from '@supabase/supabase-js'


const supabaseUrl = 'https://tu-id-de-proyecto.supabase.co' 


const supabaseKey = 'sb_publishable_pB_sYi_jGHXnZOE-U4EePw_AUiNnIad...' 

export const supabase = createClient(supabaseUrl, supabaseKey)