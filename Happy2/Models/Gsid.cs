using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Collections.Concurrent;
using System.Threading;

namespace Happy2
{
	public class GsidInfo
	{
		public int Gsid;
		public bool Modified;

		public GsidInfo(int gsid)
		{
			this.Gsid = gsid;
		}
	}
	public static class GsidManager
	{
		private static ConcurrentDictionary<string, GsidInfo> dict = new ConcurrentDictionary<string, GsidInfo>();
		private static Timer timer;

		static GsidManager()
		{
			timer = new Timer(Save, null, 3 * 60 * 1000/*ms*/, 3 * 60 * 1000/*ms*/);
		}
		private static GsidInfo read(string room_name)
		{
			int gsid = RoomStore.ReadRoomGsid(room_name);
			return new GsidInfo(gsid);
		}
		public static int Get(string room_name)
		{
			GsidInfo info;

			info = dict.GetOrAdd(room_name, rn => read(rn));

			int gsid = Interlocked.Increment(ref info.Gsid);
			info.Modified = true;

			return gsid - 1;
		}
		public static void Save(object state)
		{
			foreach (KeyValuePair<string, GsidInfo> pair in dict)
			{
				if (pair.Value.Modified)
				{
					pair.Value.Modified = false;
					RoomStore.WriteRoomGsid(pair.Key, pair.Value.Gsid);
				}
			}
		}
	}
}