using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
//using System.Web.Http;
using System.Web.Mvc;

namespace Happy2
{
	public class HomeController : Controller
	{
		[HttpGet]
		public ActionResult Index()
		{
			return File("/index.html", "text/html");
		}
		[HttpPost]
		public ActionResult Picture(/*int x, int y, string room*/)
		{
			HttpFileCollectionBase files = Request.Files;

			string uri = PictureStore.Save(files);

			//PictureInfo info = PictureManager.Add(room, uri, x, y);

			//DrawingBroadcaster.HubContext.Clients.All.onNewPicture(info);

			return Json(new { uri = uri });
		}
		[HttpPost]
		public ActionResult PathBatch(int fm)
		{
			HttpFileCollectionBase files = Request.Files;

			string uri = PathBatchStore.Save(files);

			uri += "?fm=" + fm;

			return Json(new { uri = uri });
		}
	}
}