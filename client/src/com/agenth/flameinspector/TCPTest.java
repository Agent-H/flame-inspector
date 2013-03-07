package com.agenth.flameinspector;

import java.io.BufferedReader;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Socket;
import java.net.UnknownHostException;

public class TCPTest
{
    private static int    _port;
    private static Socket _socket;

    public static void main(String[] args)
    {
        String message      = "ping";
        InputStream input   = null;
        OutputStream output = null;
    
        try
        {
            _port   = (args.length == 1) ? Integer.parseInt(args[0]) : 5000;
            _socket = new Socket((String) null, _port);

            // Open stream
            input = _socket.getInputStream();
            DataInputStream reader = new DataInputStream(input);
            output = _socket.getOutputStream();
            
            while(true){
            	try {
					Thread.sleep(5000);
				} catch (InterruptedException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
            	
        		byte[] bytes = new byte[1024];
	            
	            int nbResp = reader.read(bytes);
	            
	            String response = new String(bytes);
	            System.out.println("Server message: " + response + " ("+ nbResp +")");
	            
	            System.out.println("Sending message");
	            new DataOutputStream(output).writeBytes(message);
	            
	            System.out.println("message sent");
	            // Show the server response
	            
            }
        }
        catch (UnknownHostException e)
        {
            e.printStackTrace();
        }
        catch (IOException e)
        {
            e.printStackTrace();
        }
        finally
        {
            try
            {
                input.close();
                output.close();
                _socket.close();
            }
            catch (IOException e)
            {
                e.printStackTrace();
            }
        }
    }
}