using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.WindowsAzure.Storage.Blob;
using System.IO;
using System.Collections.Concurrent;

namespace Happy2
{
	public class PictureInfo
	{
		public string Uri;
		public int X;
		public int Y;
		public DateTime CreateTime;

		public PictureInfo(string uri, int x, int y)
		{
			this.Uri = uri;
			this.X = x;
			this.Y = y;
			this.CreateTime = DateTime.Now;
		}
		public bool Expired()
		{
			return DateTime.Now > this.CreateTime.AddMinutes(10);
		}
	}
	public class PictureRoll
	{
		private ConcurrentQueue<PictureInfo> queue = new ConcurrentQueue<PictureInfo>();

		public void Add(PictureInfo info)
		{
			PictureInfo dummy;

			if (queue.Count >= 10)
				queue.TryDequeue(out dummy);

			queue.Enqueue(info);
		}
		public IEnumerable<PictureInfo> Get()
		{
			return queue;
		}
		public bool/*empty*/ Purge()
		{
			while (queue.Count > 0)
			{
				PictureInfo info;

				if (!queue.TryPeek(out info))
					break;
				if (info.Expired())
				{
					if (!queue.TryDequeue(out info))
						break;
				}
				else
					break;
			}
			return queue.Count == 0;
		}		
	}
	public static class PictureManager
	{
		private static ConcurrentDictionary<string, DateTime> lastPurgeTimeDict = new ConcurrentDictionary<string, DateTime>();
		private static ConcurrentDictionary<string, PictureRoll> roomPictureDict = new ConcurrentDictionary<string, PictureRoll>();

		public static PictureInfo Add(string room, string uri, int x, int y)
		{
			PictureRoll roll = roomPictureDict.GetOrAdd(room, r => new PictureRoll());
			PictureInfo info = new PictureInfo(uri, x, y);
			roll.Add(info);
			return info;
		}
		public static IEnumerable<PictureInfo> Get(string room)
		{
			purge(room);

			PictureRoll roll;

			if (roomPictureDict.TryGetValue(room, out roll))
				return roll.Get();
			return null;
		}
		private static void purge(string room)
		{
			DateTime dt;
			DateTime now = DateTime.Now;

			if (lastPurgeTimeDict.TryGetValue(room, out dt))
			{
				if (now <= dt.AddMinutes(3))
					return;
			}
			lastPurgeTimeDict[room] = now;

			PictureRoll roll;
			if (roomPictureDict.TryGetValue(room, out roll))
			{
				if (roll.Purge())
					roomPictureDict.TryRemove(room, out roll);
			}
		}
	}
	public static class PictureStore
	{
		private static string uploadFile(HttpPostedFileBase file, string folder_name, string file_name)
		{
			// shrunk image files have file name "blob".
			string ext = Path.GetExtension(file.FileName);		// todo: xss attack ?
			if (ext.Length == 0)
				if (file.ContentType == "image/jpeg")
					ext = ".jpg";
				else if (file.ContentType == "image/png")
					ext = ".png";

			string blob_name = file_name + ext;
			blob_name = folder_name + "/" + blob_name;

			CloudBlockBlob block_blob = Warehouse.PictureContainer.GetBlockBlobReference(blob_name);

			block_blob.Properties.ContentType = file.ContentType;
			block_blob.Properties.CacheControl = "public, max-age=2592000";		// 30 days
			block_blob.UploadFromStream(file.InputStream);		// if the same file.InputStream is uploaded twice, the latter one gets zero bytes of data.
			//block_blob.SetProperties();

			string uri = @"http://i.hela.cc" + block_blob.Uri.PathAndQuery;
			return uri;
		}
		public static string Save(HttpFileCollectionBase files)
		{
			string folder_name = Util.DateTimeToString(DateTime.Now, 4);
			string file_name = Util.RandomAlphaNumericString(4);

			HttpPostedFileBase file = files["picture"];
			string uri = uploadFile(file, folder_name, file_name);

			return uri;
		}
	}
	public static class PathBatchStore
	{
		private static string uploadFile(HttpPostedFileBase file, string folder_name, string file_name)
		{
			string blob_name = file_name + ".pbt";
			blob_name = folder_name + "/" + blob_name;

			CloudBlockBlob block_blob = Warehouse.PathBatchContainer.GetBlockBlobReference(blob_name);

			block_blob.Properties.ContentType = file.ContentType;
			block_blob.Properties.CacheControl = "public, max-age=2592000";		// 30 days
			block_blob.UploadFromStream(file.InputStream);		// if the same file.InputStream is uploaded twice, the latter one gets zero bytes of data.

			string uri = @"http://i.hela.cc" + block_blob.Uri.PathAndQuery;
			return uri;
		}
		public static string Save(HttpFileCollectionBase files)
		{
			string folder_name = Util.DateTimeToString(DateTime.Now, 4);
			string file_name = Util.RandomAlphaNumericString(5);

			HttpPostedFileBase file = files["path_batch"];
			string uri = uploadFile(file, folder_name, file_name);

			return uri;
		}
	}
}