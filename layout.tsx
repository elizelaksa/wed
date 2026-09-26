import type { Metadata } from 'next';
import './styles.css';
export const metadata:Metadata={title:'Friends Included · Finance',description:'Wedding guests, real accounting. Day 4 homework by Elīze Ļaksa.'};
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
