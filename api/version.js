import {APP_VERSION} from '../src/version.js';
export default function handler(req,res){res.setHeader('Cache-Control','no-store');return res.status(200).json({version:APP_VERSION});}
