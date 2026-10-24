import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ShopBrand } from "@/components/ShopBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequireAuth } from "@/hooks/useAuth";
import { shopDays, emptyHours, validateHours, type Hours } from "@/lib/shop-settings";
export const Route = createFileRoute("/settings")({head:()=>({meta:[{title:"Shop Settings — Masibambane"},{name:"description",content:"Masibambane opening hours and shop contact details."},{property:"og:title",content:"Shop Settings — Masibambane"},{property:"og:description",content:"Masibambane opening hours and shop contact details."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:SettingsPage});
function SettingsPage(){
 const {user,loading}=useRequireAuth(); const qc=useQueryClient();
 const [contact,setContact]=useState({phone:"",email:"",address:""});const [hours,setHours]=useState<Hours>(emptyHours);const [busy,setBusy]=useState(false);
 const query=useQuery({queryKey:["shop-settings"],enabled:!!user,queryFn:async()=>{const {data,error}=await supabase.from("shop_settings").select("*").eq("id",1).maybeSingle();if(error)throw error;return data;}});
 useEffect(()=>{if(query.data){setContact({phone:query.data.phone,email:query.data.email,address:query.data.address});const raw=query.data.opening_hours;const next=emptyHours();if(raw && typeof raw==="object" && !Array.isArray(raw)){for(const day of shopDays){const h=raw[day];if(h && typeof h==="object" && !Array.isArray(h)) next[day]={closed:h['closed']===true,opens:typeof h['opens']==="string"?h['opens']:"",closes:typeof h['closes']==="string"?h['closes']:""};}}setHours(next);}},[query.data]);
 async function save(e:React.FormEvent){e.preventDefault();try{validateHours(hours);setBusy(true);const {error}=await supabase.from("shop_settings").upsert({id:1,...contact,opening_hours:hours,updated_at:new Date().toISOString()});if(error)throw error;await qc.invalidateQueries({queryKey:["shop-settings"]});toast.success("Shop settings saved");}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}}
 if(loading)return null;
 return <AppShell><div className="space-y-6"><h2 className="text-3xl font-semibold">Shop settings</h2><ShopBrand large />{query.isError?<p role="alert" className="text-destructive">Could not load shop settings. Please refresh.</p>:<form onSubmit={save} className="space-y-6"><section className="space-y-3"><h3 className="text-lg font-semibold">Contact details</h3>{(["phone","email","address"] as const).map(key=><label key={key} className="block text-sm capitalize">{key}<Input type={key==="email"?"email":"text"} maxLength={key==="address"?300:100} value={contact[key]} onChange={e=>setContact({...contact,[key]:e.target.value})}/></label>)}</section><section className="space-y-3 border-t border-border pt-5"><h3 className="text-lg font-semibold">Opening hours</h3>{shopDays.map(day=>{const h=hours[day];if(!h)return null;return <div key={day} className="grid grid-cols-2 gap-2 border-b border-border pb-3 sm:grid-cols-4"><p className="self-center text-sm font-medium">{day}</p><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={h.closed} onChange={e=>setHours({...hours,[day]:{...h,closed:e.target.checked}})}/>Closed</label><label className="text-xs">Opens<Input aria-label={`${day} opens`} type="time" disabled={h.closed} value={h.opens} onChange={e=>setHours({...hours,[day]:{...h,opens:e.target.value}})}/></label><label className="text-xs">Closes<Input aria-label={`${day} closes`} type="time" disabled={h.closed} value={h.closes} onChange={e=>setHours({...hours,[day]:{...h,closes:e.target.value}})}/></label></div>;})}</section><Button type="submit" disabled={busy||query.isPending}><Save/>{busy?"Saving…":"Save shop settings"}</Button></form>}</div></AppShell>;
}