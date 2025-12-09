
import type { CorsOptions } from "cors";

export const corsOptions : CorsOptions ={
  origin :[
    "https://localhost:3000",
    "https://localhost:5173",
    "*"
  ],
  credentials : true,
  methods :["GET" , "POST" , "PUT" , "PATCH" ,"DELETE" ]

}