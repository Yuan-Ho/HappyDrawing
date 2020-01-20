using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;

namespace Happy2
{
	public class LocationConstraint : IRouteConstraint
	{
		public LocationConstraint()
		{
		}
		public bool Match(HttpContextBase httpContext, Route route, string parameterName, RouteValueDictionary values, RouteDirection routeDirection)
		{
			string value = (string)values[parameterName];
			// Value won't be empty string but may be UrlParameter.Optional.

			if (value[0] == '@')
			{
				int pos = value.IndexOf(',');
				if (pos != -1)
				{
					return Util.IsNumber(value, 1, pos) && Util.IsNumber(value, pos + 1);
				}
			}
			return false;
		}
	}
	public class RouteConfig
	{
		public static void RegisterRoutes(RouteCollection routes)
		{
			routes.IgnoreRoute("{resource}.axd/{*pathInfo}");
			routes.IgnoreRoute("");

			routes.MapRoute(
				name: "Default",
				url: "{location}",
				defaults: new { controller = "Home", action = "Index" },
				constraints: new { location = new LocationConstraint() }
			);
			routes.MapRoute(
				"Picture",
				"Picture",
				new { controller = "Home", action = "Picture" }
			);
			routes.MapRoute(
				"PathBatch",
				"PathBatch",
				new { controller = "Home", action = "PathBatch" }
			);
			routes.MapRoute(
				"Room",
				"{room_name}",
				new { controller = "Home", action = "Index" }
			);
		}
	}
}
