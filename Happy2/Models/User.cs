using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Threading;
using System.Collections.Concurrent;
using Newtonsoft.Json;

namespace Happy2
{
	public class UserStatus
	{
		public string Name;
		public string Status;
		[JsonIgnore]
		public DateTime LastUpdateTime;

		public UserStatus(string name, string status)
		{
			this.Name = name;
			this.Status = status;
			this.LastUpdateTime = DateTime.Now;
		}
	}
	public static class UserCenter
	{
		private static ConcurrentDictionary<string, ConcurrentDictionary<string, UserStatus>> statusDict = new ConcurrentDictionary<string, ConcurrentDictionary<string, UserStatus>>();
		private static Dictionary<string/*room name*/, Dictionary<string/*user id*/, Point2>> positionDict = new Dictionary<string, Dictionary<string, Point2>>();
		private static Timer timer;
		private static Timer purgeTimer;

		static UserCenter()
		{
			timer = new Timer(onTimer, null, 1000/*ms*/, 1000/*ms*/);
			purgeTimer = new Timer(purgeOldUsers, null, 5 * 60 * 1000/*ms*/, 5 * 60 * 1000/*ms*/);
		}
		public static void UpdateStatus(string room_name, string user_id, string name, string status)
		{
			UserStatus us = new UserStatus(name, status);

			ConcurrentDictionary<string, UserStatus> dict = statusDict.GetOrAdd(room_name, rn => new ConcurrentDictionary<string, UserStatus>());

			dict[user_id] = us;

			//DrawingBroadcaster.HubContext.Clients.All.onUpdateStatus(user_id, us);
			DrawingBroadcaster.HubContext.Clients.Group(room_name).onUpdateStatus(user_id, us);
		}
		public static IDictionary<string, UserStatus> GetAllStatus(string room_name)
		{
			ConcurrentDictionary<string, UserStatus> dict;
			if (statusDict.TryGetValue(room_name, out dict))
				return dict;
			return null;
		}
		private static void purgeOldUsers(object state)
		{
			DateTime now = DateTime.Now;
			UserStatus dummy;

			foreach (KeyValuePair<string, ConcurrentDictionary<string, UserStatus>> pair2 in statusDict)
			{
				foreach (KeyValuePair<string, UserStatus> pair in pair2.Value)
				{
					if (now > pair.Value.LastUpdateTime.AddHours(1))
						pair2.Value.TryRemove(pair.Key, out dummy);
				}
			}
		}
		public static void UpdatePosition(string room_name, string user_id, double x, double y)
		{
			lock (positionDict)
			{
				Dictionary<string, Point2> i_dict;

				if (!positionDict.TryGetValue(room_name, out i_dict))
				{
					i_dict = new Dictionary<string, Point2>();
					positionDict.Add(room_name, i_dict);
				}
				i_dict[user_id] = new Point2(x, y);
				//positionDict[user_id] = new Point2(x, y);
			}
			//
			ConcurrentDictionary<string, UserStatus> dict;
			if (statusDict.TryGetValue(room_name, out dict))
			{
				UserStatus us;
				if (dict.TryGetValue(user_id, out us))
					us.LastUpdateTime = DateTime.Now;
			}
		}
		private static void onTimer(object state)
		{
			lock (positionDict)
			{
#if OLD
				if (positionDict.Count > 0)
				{
					DrawingBroadcaster.HubContext.Clients.All.onUpdatePosition(positionDict);

					positionDict.Clear();
				}
#else
				foreach (KeyValuePair<string, Dictionary<string, Point2>> pair in positionDict)
				{
					if (pair.Value.Count > 0)
					{
						//DrawingBroadcaster.HubContext.Clients.All.onUpdatePosition(pair.Value);
						DrawingBroadcaster.HubContext.Clients.Group(pair.Key).onUpdatePosition(pair.Value);

						pair.Value.Clear();
					}
				}
#endif
			}
		}
	}
	public struct UserCount : IComparable<UserCount>
	{
		[JsonProperty("r")]
		public string RoomName;
		[JsonProperty("c")]
		public int Count;

		public UserCount(string room_name, int cnt)
		{
			this.RoomName = room_name;
			this.Count = cnt;
		}
		public int CompareTo(UserCount other)
		{
			int res = -Count.CompareTo(other.Count);

			if (res == 0)
				res = RoomName.CompareTo(other.RoomName);

			return res;
		}
	}
	public static class HotRoomCenter
	{
		private static ConcurrentDictionary<string, ConcurrentDictionary<string, DateTime/*last update time*/>> roomDict =
					new ConcurrentDictionary<string, ConcurrentDictionary<string, DateTime>>();
		private static Timer timer;

		private const int LIST_SIZE = 10;

		private static SortedSet<UserCount> hotRoomList = new SortedSet<UserCount>();

		static HotRoomCenter()
		{
			timer = new Timer(purge, null, 2 * 60 * 1000/*ms*/, 2 * 60 * 1000/*ms*/);
		}
		public static void Update(string room_name, string user_id)
		{
			ConcurrentDictionary<string, DateTime> dict = roomDict.GetOrAdd(room_name, rn => new ConcurrentDictionary<string, DateTime>());

			int prev_cnt = dict.Count;

			dict[user_id] = DateTime.Now;

			if (dict.Count != prev_cnt)
				onChange(room_name, dict.Count);
		}
		private static void purge(object state)
		{
			DateTime now = DateTime.Now;

			foreach (KeyValuePair<string, ConcurrentDictionary<string, DateTime>> pair2 in roomDict)
			{
				int prev_cnt = pair2.Value.Count;

				foreach (KeyValuePair<string, DateTime> pair in pair2.Value)
				{
					DateTime dummy;
					if (now > pair.Value.AddMinutes(5))
						pair2.Value.TryRemove(pair.Key, out dummy);
				}
				if (pair2.Value.Count != prev_cnt)
					onChange(pair2.Key, pair2.Value.Count);
			}
		}
		private static void onChange(string room_name, int cnt)
		{
			lock (hotRoomList)
			{
				hotRoomList.RemoveWhere(uc => uc.RoomName == room_name);

				if (cnt > 0)
					hotRoomList.Add(new UserCount(room_name, cnt));

				while (hotRoomList.Count > LIST_SIZE)
					hotRoomList.Remove(hotRoomList.Max);
			}
		}
		public static IEnumerable<UserCount> GetHotRoomList()
		{
			lock (hotRoomList)
			{
				UserCount[] arr = new UserCount[hotRoomList.Count];
				hotRoomList.CopyTo(arr);
				return arr;
			}
		}
	}
}