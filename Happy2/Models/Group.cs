using Microsoft.AspNet.SignalR;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Happy2
{
	public class GroupInfo
	{
		public DateTime LastActiveTime;
		public string Room;

		public GroupInfo(string room)
		{
			Refresh(room);
		}
		public void Refresh(string room)
		{
			this.Room = room;
			this.Refresh();
		}
		public void Refresh()
		{
			this.LastActiveTime = DateTime.Now;
		}
		public bool Expired()
		{
			return DateTime.Now > this.LastActiveTime.AddMinutes(5);
		}
	}
	public static class GroupManager
	{
		private static ConcurrentDictionary<string, GroupInfo> groupDict = new ConcurrentDictionary<string, GroupInfo>();
		private static DateTime lastPurgeTime;

		public static void EnterRoom(IGroupManager groups, string conn_id, string room)
		{
			purge(groups);

			groupDict.AddOrUpdate(conn_id, c_id =>
									{
										groups.Add(c_id, room);
										return new GroupInfo(room);
									}, (c_id, info) =>
									{
										if (info.Room != room)
										{
											groups.Remove(c_id, info.Room);

											groups.Add(c_id, room);
										}
										info.Refresh(room);

										return info;
									});
		}
		public static string GetRoomName(string conn_id)
		{
			GroupInfo info;

			if (groupDict.TryGetValue(conn_id, out info))
				return info.Room;
			return null;
		}
		private static void purge(IGroupManager groups)
		{
			DateTime now = DateTime.Now;
			if (now <= lastPurgeTime.AddMinutes(3))
				return;
			lastPurgeTime = now;

			GroupInfo dummy;

			foreach (KeyValuePair<string, GroupInfo> pair in groupDict)
			{
				if (pair.Value.Expired())
				{
					if (groupDict.TryRemove(pair.Key, out dummy))
						groups.Remove(pair.Key, pair.Value.Room);
				}
			}
		}
	}
}
