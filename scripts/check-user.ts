import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    const user = data.users.find(u => u.email === "info@lovelymemories.pt");
    if (user) {
        console.log("User found:");
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Email Confirmed: ${user.email_confirmed_at != null}`);

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            console.log("Profile found:", profile);
        } else {
            console.log("No profile found or error:", profileError?.message);
        }
    } else {
        console.log("User NOT found in Auth.");
    }
}

checkUser();
