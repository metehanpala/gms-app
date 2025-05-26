// See https://aka.ms/new-console-template for more information

using System.Security.Cryptography.X509Certificates;
using System.Runtime.InteropServices;

namespace Siemens.Gms.FlexClient
{
    class CertificateDialog
    {
        static int Main(string[] args)
        {
            if (args.Length > 0)
            {
                try
                {
                    byte[] rawData = System.Convert.FromBase64String(args[0]);
                    X509Certificate2 certificate = new X509Certificate2(rawData);
                    if (args.Length > 1)
                    {
                        Console.WriteLine("CertificateDialog - Show certificate with handle: " + certificate.SubjectName.Name);
                        X509Certificate2UI.DisplayCertificate(certificate, IntPtr.Parse(args[1]));
                    }
                    else
                    {
                        Console.WriteLine("CertificateDialog - Show certificate without handle: " + certificate.SubjectName.Name);
                        X509Certificate2UI.DisplayCertificate(certificate);
                    }
                }
                catch (Exception exc)
                {
                    Console.WriteLine("CertificateDialog - Show certificate error: " + exc.Message);
                    return -1;
                }
            }
            return 0;
        }
    }
}
