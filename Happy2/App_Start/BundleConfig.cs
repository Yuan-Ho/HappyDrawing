using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Optimization;

namespace Happy2
{
	public class BundleConfig
	{
		public static void RegisterBundles(BundleCollection bundles)
		{
			bundles.Add(new ScriptBundle("~/bundles/drawing").Include(
						"~/Scripts/app/helper.js",
						"~/Scripts/app/drawing.js"));

			bundles.Add(new StyleBundle("~/Content/app/css").Include(
						"~/Content/app/drawing.css"));
		}
	}
}