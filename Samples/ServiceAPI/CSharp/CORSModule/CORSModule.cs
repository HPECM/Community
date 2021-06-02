using System;
using System.Configuration;
using System.Linq;
using System.Net;

using System.Web;
// THANK YOU: 
// * https://evolpin.wordpress.com/2012/10/12/the-cors/
// * Thomas Tran

public class CORSModule : IHttpModule
{
    private string[] origins;
    private string methods = "POST,GET,OPTIONS";
    private string headers = "Content-Type, Authorization";

    public void Init(HttpApplication context)
    {

        //Get list of origin domains
        var originConfigs = ConfigurationManager.AppSettings["allowedOrigins"];


        this.origins = (originConfigs ?? "").Split(',').Select(o => o.Trim()).Where(o => !string.IsNullOrEmpty(o)).ToArray();

        context.PreSendRequestHeaders += delegate
        {

            var response = context.Response;

           #region try to build the current url requested by user
           var referredUrl = "";

            if (context.Request.UrlReferrer != null)
            {
                referredUrl = context.Request.UrlReferrer.Scheme + "://" + context.Request.UrlReferrer.Host;
                if (context.Request.UrlReferrer.Port != 80)
                {
                    referredUrl = referredUrl + ":" + context.Request.UrlReferrer.Port;
                }
            }
           #endregion

           //check the current origin within the list from config file. 
           //if yes, add it to the response header
           if (this.origins.Contains(referredUrl, StringComparer.InvariantCultureIgnoreCase))
            {
                response.AppendHeader("Access-Control-Allow-Origin", referredUrl);
                response.AppendHeader("Access-Control-Allow-Credentials", "true");

                if (!string.IsNullOrWhiteSpace(this.methods))
                {
                    response.AppendHeader("Access-Control-Allow-Methods", this.methods);
                }
                if (!string.IsNullOrWhiteSpace(this.headers))
                {
                    response.AppendHeader("Access-Control-Allow-Headers", this.headers);
                }
            }
           //otherwise allow all origins by default if no origins set in appSettings
           else if (this.origins.Length == 0)
            {
                response.AppendHeader("Access-Control-Allow-Origin", "*");
                response.AppendHeader("Access-Control-Allow-Credentials", "false");

                if (!string.IsNullOrWhiteSpace(this.methods))
                {
                    response.AppendHeader("Access-Control-Allow-Methods", this.methods);
                }

                if (!string.IsNullOrWhiteSpace(this.headers))
                {
                    response.AppendHeader("Access-Control-Allow-Headers", this.headers);
                }
            }


           //fix preflight
           if (context.Request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = (int)HttpStatusCode.OK;
            }

        };


    }

    public void Dispose()
    {

    }
}

