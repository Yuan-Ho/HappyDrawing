using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.WindowsAzure.Storage.Table;
using System.Threading;
using System.Collections.Concurrent;

namespace Happy2
{
	public struct BlockIndex
	{
		public int x;
		public int y;

		public BlockIndex(int x, int y)
		{
			this.x = x;
			this.y = y;
		}
	}
	public struct Point
	{
		public int X;
		public int Y;

		public Point(int x, int y)
		{
			this.X = x;
			this.Y = y;
		}
	}
	public struct Point2
	{
		public double X;
		public double Y;

		public Point2(double x, double y)
		{
			this.X = x;
			this.Y = y;
		}
	}
	[Flags]
	public enum RoomAttributes
	{
		LIMITED = 1,
		CAN_PICTURE = 2,
		IS_PRIVATE = 4,
	}
	public class RoomInfo
	{
		public string Name;
		public int Size;
		public int Attr;
		public DateTime CreateDate;

		public int HomeX;
		public int HomeY;
		public int EntranceX;
		public int EntranceY;

		public RoomInfo(RoomInfoEntity entity)
		{
			this.Name = entity.Name;
			this.Size = entity.Size;
			this.Attr = entity.Attr;
			this.CreateDate = entity.CreateDate;
			this.HomeX = entity.HomeX;
			this.HomeY = entity.HomeY;
			this.EntranceX = entity.EntranceX;
			this.EntranceY = entity.EntranceY;
		}
	}
	public class RoomInfoEntity : TableEntity
	{
		public string Name { get; set; }
		public int Size { get; set; }
		public int Attr { get; set; }
		public DateTime CreateDate { get; set; }

		public int HomeX { get; set; }
		public int HomeY { get; set; }
		public int EntranceX { get; set; }
		public int EntranceY { get; set; }

		public RoomInfoEntity()
		{
		}
		public RoomInfoEntity(int room_id, string name, int entrance_x, int entrance_y, int size, int attr)
		{
			int page_id = (int)(room_id / Config.NUM_ROOMS_IN_A_PAGE);
			int inner_id = room_id - page_id * Config.NUM_ROOMS_IN_A_PAGE;

			this.PartitionKey = Config.ROOM_PAGE_KEY_PREFIX + page_id.ToString();
			//this.RowKey = Config.ROOM_INNER_KEY_PREFIX + inner_id.ToString();
			this.RowKey = Config.ROOM_INNER_KEY_PREFIX + inner_id.ToString("D" + Config.ROOM_INNER_KEY_DIGITS);

			this.HomeX = this.EntranceX = entrance_x;
			this.HomeY = this.EntranceY = entrance_y;

			this.Name = name;
			this.Size = size;
			this.Attr = attr/*(int)RoomAttributes.LIMITED*/;
			this.CreateDate = DateTime.Now;
		}
	}
	public static class RoomList
	{
		private const char SEPARATOR = ';';
		private const int LIST_LEN_LIMIT = 10 * 100;		// arbitrary

		private static string roomList;

		static RoomList()
		{
			read();
		}
		private static void read()
		{
			TableResult result = Warehouse.RoomsTable.Execute(TableOperation.Retrieve("Lists", "Last"));
			DynamicTableEntity entity = (DynamicTableEntity)result.Result;

			if (entity == null)
			{
				entity = new DynamicTableEntity("Lists", "Last");

				entity["data"] = new EntityProperty("");

				Warehouse.RoomsTable.Execute(TableOperation.Insert(entity));
			}
			roomList = entity["data"].StringValue;
		}
		private static void write()
		{
			DynamicTableEntity entity = new DynamicTableEntity("Lists", "Last");

			entity["data"] = new EntityProperty(roomList);

			Warehouse.RoomsTable.Execute(TableOperation.InsertOrReplace(entity));
		}
		public static void OnNewRoom(string name)
		{
			lock (roomList)
			{
				read();

				if (roomList.Length >= LIST_LEN_LIMIT)
				{
					int idx = roomList.IndexOf(SEPARATOR);
					if (idx != -1)
						roomList = roomList.Substring(idx + 1);
					else
						roomList = string.Empty;
				}
				if (roomList.Length > 0)
					roomList += SEPARATOR + name;
				else
					roomList = name;

				write();
			}
		}
		public static string GetRoomList()
		{
			return roomList;
		}
	}
	public static class RoomNameGuard
	{
		private static ConcurrentDictionary<string, string> nameDict = new ConcurrentDictionary<string, string>();

		static RoomNameGuard()
		{
			string lower = Config.ROOM_PAGE_KEY_PREFIX.ToString();
			string upper = ((char)(Config.ROOM_PAGE_KEY_PREFIX + 1)).ToString();

			string rkLowerFilter = TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.GreaterThanOrEqual, lower);
			string rkUpperFilter = TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.LessThan, upper);
			string combinedFilter = TableQuery.CombineFilters(rkLowerFilter, TableOperators.And, rkUpperFilter);

			TableQuery query = new TableQuery().Where(combinedFilter);

			foreach (DynamicTableEntity entity in Warehouse.RoomsTable.ExecuteQuery(query))
			{
				string room_name = entity["Name"].StringValue;

				nameDict.TryAdd(room_name.ToLowerInvariant(), room_name);
			}
		}
		public static void OnNewRoom(string room_name)
		{
			nameDict.TryAdd(room_name.ToLowerInvariant(), room_name);
		}
		public static string CheckName(string room_name)
		{
			string canonical_room_name;

			if (nameDict.TryGetValue(room_name.ToLowerInvariant(), out canonical_room_name))
				return canonical_room_name;

			throw new ArgumentException();
		}
	}
	public static class RoomHomeManager
	{
		private static ConcurrentDictionary<string, DateTime> lastUpdateTimeDict = new ConcurrentDictionary<string, DateTime>();

		private static void updateRoomHome(string name)
		{
			RoomInfoEntity entity = RoomStore.GetRoom(name);
			if (entity != null)
			{
				int num_of_paths = DrawingStore.GetNumberOfPaths(entity.HomeX, entity.HomeY);
				if (num_of_paths < Config.MOVE_HOME_THRESHOLD)
					return;

#if GO_SLOWER
				num_of_paths = DrawingStore.GetNumberOfPaths(entity.HomeX, entity.HomeY + 1);
				if (num_of_paths < Config.MOVE_HOME_THRESHOLD)
					return;

				num_of_paths = DrawingStore.GetNumberOfPaths(entity.HomeX, entity.HomeY - 1);
				if (num_of_paths < Config.MOVE_HOME_THRESHOLD)
					return;
#endif
				if (entity.HomeX < 0)
					if (entity.HomeY < 0)
						entity.HomeX--;
					else
						entity.HomeY++;
				else
					if (entity.HomeY < 0)
						entity.HomeY--;
					else
						entity.HomeX++;

				Warehouse.RoomsTable.Execute(TableOperation.Replace(entity));      // Throws StorageException ((412) Precondition Failed) if the entity is modified in between.

				RoomsPond.Notify(name);
			}
		}
		public static void UpdateRoomHome(string name)
		{
			DateTime dt;
			DateTime now = DateTime.Now;

			if (lastUpdateTimeDict.TryGetValue(name, out dt))
			{
				if (now <= dt.AddMinutes(3))
					return;
			}
			lastUpdateTimeDict[name] = now;
			updateRoomHome(name);
		}
	}
	public static class RoomStore
	{
		public static int ReadRoomGsid(string room_name)
		{
			string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant();

			return Warehouse.RoomsTable.GetIntProperty(partition_key, Config.EMPTY_KEY, "gsid", 0);
		}
		public static void WriteRoomGsid(string room_name, int gsid)
		{
			string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant();

			Warehouse.RoomsTable.SetIntProperty(partition_key, Config.EMPTY_KEY, "gsid", gsid);
		}
		private static RoomInfoEntity getRoom(int room_id)
		{
			int page_id = (int)(room_id / Config.NUM_ROOMS_IN_A_PAGE);
			int inner_id = room_id - page_id * Config.NUM_ROOMS_IN_A_PAGE;

			string partition_key = Config.ROOM_PAGE_KEY_PREFIX + page_id.ToString();
			string row_key = Config.ROOM_INNER_KEY_PREFIX + inner_id.ToString("D" + Config.ROOM_INNER_KEY_DIGITS);

			TableOperation op = TableOperation.Retrieve<RoomInfoEntity>(partition_key, row_key);

			TableResult result = Warehouse.RoomsTable.Execute(op);

			return (RoomInfoEntity)result.Result;
		}
		public static RoomInfoEntity GetRoom(string name)
		{
			string partition_key = Config.ROOM_NAME_KEY_PREFIX + name.ToLowerInvariant();

			TableOperation op = TableOperation.Retrieve(partition_key, Config.EMPTY_KEY);
			TableResult result = Warehouse.RoomsTable.Execute(op);		// StorageException: 遠端伺服器傳回一個錯誤: (400) 不正確的要求。 if partition_key is invalid.

			DynamicTableEntity entity = (DynamicTableEntity)result.Result;

			if (entity != null)
			{
				int room_id = (int)entity["roomid"].Int32Value;

				return getRoom(room_id);
			}
			else
				return null;
		}
		private static void createRoomNameEntry(int next_id, string name)
		{
			DynamicTableEntity rn_entity = new DynamicTableEntity(Config.ROOM_NAME_KEY_PREFIX + name.ToLowerInvariant(), Config.EMPTY_KEY);

			rn_entity["roomid"] = new EntityProperty(next_id);

			Warehouse.RoomsTable.Execute(TableOperation.Insert(rn_entity));		// StorageException: 遠端伺服器傳回一個錯誤: (409) 衝突。 if already exists.
		}
		public static bool CreateRoom(string name, int size, int attr)
		{
			TableResult result = Warehouse.RoomsTable.Execute(TableOperation.Retrieve("Rooms", Config.SPECIAL_KEY));
			DynamicTableEntity entity = (DynamicTableEntity)result.Result;

			if (entity == null)
			{
				entity = new DynamicTableEntity("Rooms", Config.SPECIAL_KEY);

				entity["nextid"] = new EntityProperty(0);
				//entity["borderx"] = new EntityProperty(100);
				entity["bordery"] = new EntityProperty(100);

				Warehouse.RoomsTable.Execute(TableOperation.Insert(entity));
			}
			if (!entity.Properties.ContainsKey("borderny"))
				entity["borderny"] = new EntityProperty(-100);

			int next_id = (int)entity["nextid"].Int32Value;

			createRoomNameEntry(next_id, name);		// let it throw exception if the name already exists.

			entity["nextid"].Int32Value = next_id + 1;

			bool is_private = (attr & (int)RoomAttributes.IS_PRIVATE) != 0;
			int entrance_x, entrance_y;

			if (is_private)
			{
				entrance_x = Warehouse.Random.Next(1000, 10000);
				entrance_y = Warehouse.Random.Next(-10000, -1000);
			}
			else
			{
				bool ny = (attr & (int)RoomAttributes.CAN_PICTURE) != 0;

				int border_y = (int)entity[ny ? "borderny" : "bordery"].Int32Value;
				int delta_y = ((int)((size - 1) / 2) + 1) * (ny ? -1 : 1);

				entrance_x = ny ? -100 : 100;
				entrance_y = border_y + delta_y;

				entity[ny ? "borderny" : "bordery"].Int32Value = border_y + 2 * delta_y;
			}
			Warehouse.RoomsTable.Execute(TableOperation.Replace(entity));      // Throws StorageException ((412) Precondition Failed) if the entity is modified in between.
			//
			RoomInfoEntity ri_entity = new RoomInfoEntity(next_id, name, entrance_x, entrance_y, size, attr);
			Warehouse.RoomsTable.Execute(TableOperation.Insert(ri_entity));		// StorageException: 遠端伺服器傳回一個錯誤: (409) 衝突。 if the key already exists.
			//
			if (!is_private)
				RoomList.OnNewRoom(name);
			RoomNameGuard.OnNewRoom(name);
			return true;
		}
	}
#if OLD
	public static class HomeManager
	{
		private static Point homeBlockIndex;
		private static readonly object homeLock = new object();
		private static Timer timer;

		static HomeManager()
		{
			read();
			timer = new Timer(onTimer, null, 3 * 60 * 1000/*ms*/, 3 * 60 * 1000/*ms*/);
		}
		private static void read()
		{
			TableResult result = Warehouse.RoomsTable.Execute(TableOperation.Retrieve("Rooms", "Home"));
			DynamicTableEntity entity = (DynamicTableEntity)result.Result;

			if (entity == null)
			{
				entity = new DynamicTableEntity("Rooms", "Home");

				entity["bx"] = new EntityProperty(20);
				entity["by"] = new EntityProperty(20);

				Warehouse.RoomsTable.Execute(TableOperation.Insert(entity));
			}
			homeBlockIndex = new Point((int)entity["bx"].Int32Value, (int)entity["by"].Int32Value);
		}
		public static Point GetHome()
		{
			return homeBlockIndex;
		}
		//public static void onNewPath(int block_idx_x, int block_idx_y, int num_of_paths)

		public static void write()
		{
			DynamicTableEntity entity = new DynamicTableEntity("Rooms", "Home");

			entity["bx"] = new EntityProperty(homeBlockIndex.X);
			entity["by"] = new EntityProperty(homeBlockIndex.Y);

			Warehouse.RoomsTable.Execute(TableOperation.InsertOrReplace(entity));
		}
		private static void onTimer(object state)
		{
			lock (homeLock)
			{
				read();

				int num_of_paths = DrawingStore.GetNumberOfPaths(homeBlockIndex.X, homeBlockIndex.Y);
				if (num_of_paths < Config.MOVE_HOME_THRESHOLD)
					return;

				num_of_paths = DrawingStore.GetNumberOfPaths(homeBlockIndex.X, homeBlockIndex.Y + 1);
				if (num_of_paths < Config.MOVE_HOME_THRESHOLD)
					return;

				num_of_paths = DrawingStore.GetNumberOfPaths(homeBlockIndex.X, homeBlockIndex.Y - 1);
				if (num_of_paths < Config.MOVE_HOME_THRESHOLD)
					return;

				homeBlockIndex.X++;
				write();
			}
		}
	}
#endif
}