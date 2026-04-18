import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function test() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .is('deleted_at', null)
  
  if (error) {
    console.error(error)
    return
  }
  
  console.log(`Total active leads: ${data.length}`)
  console.log(`IA: ${data.filter(l => l.fonte?.toLowerCase() === 'ia').length}`)
  console.log(`Site: ${data.filter(l => l.fonte?.toLowerCase() === 'site').length}`)
  console.log(`Assessoria: ${data.filter(l => l.fonte?.toLowerCase() === 'assessoria').length}`)
  console.log(`Quiz: ${data.filter(l => l.fonte?.toLowerCase() === 'quiz').length}`)
}

test()
