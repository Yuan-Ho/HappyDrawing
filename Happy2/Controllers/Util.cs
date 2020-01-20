using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web;

namespace Happy2
{
	public static class Config
	{
		public const int BLOCK_FULL_THRESHOLD = 500;
		public const int BLOCK_ALMOST_FULL = BLOCK_FULL_THRESHOLD - 50;

		public const int DRAWING_ROW_KEY_DIGITS = 3;		// 3 digits for 000..499.
		public const int ROOM_INNER_KEY_DIGITS = 2;		// 2 digits for 00..99.
		public const int FIGURE_INNER_KEY_DIGITS = 2;		// 2 digits for 00..99.

		public const char SPECIAL_KEY_PREFIX = '!';
		public static readonly string SPECIAL_KEY = SPECIAL_KEY_PREFIX + "info1";
		public static readonly string EMPTY_KEY = "";
		public const char KEY_CONCAT = '.';
		public const char NAME_CONCAT = '@';

		public const char DRAWING_PAR_KEY_PREFIX = 'B';
		public const char DRAWING_ROW_KEY_PREFIX = 'S';

		public const char ROOM_PAGE_KEY_PREFIX = 'P';
		public const char ROOM_INNER_KEY_PREFIX = 'I';
		public const char ROOM_NAME_KEY_PREFIX = 'R';
		public const char NOTE_KEY_PREFIX = 'N';
		public const char FIGURE_KEY_PREFIX = 'F';

#if DEBUG
		public const int DEFAULT_CACHE_SECONDS = 3 * 60;
#else
		public const int DEFAULT_CACHE_SECONDS = 10 * 60;
#endif
		public const int MOVE_HOME_THRESHOLD = 1;
		public const int BLOCK_SIZE = 500;

		public const int NUM_ROOMS_IN_A_PAGE = 100;
		public const int NUM_FIGURES_IN_A_PAGE = 20;
	}
	public static class Consts
	{
		public const int MAIN_LAYER_NUM = 5;
	}
	[Serializable]
	public class ProgramLogicException : ApplicationException
	{
		public ProgramLogicException() : base() { }
		public ProgramLogicException(string message) : base(message) { }
	}
	public static class Util
	{
		public static string DateTimeToString(DateTime dt, int type)
		{
			if (type == 1)
				return dt.ToString("yyyy/MM/dd HH:mm:ss");
			else if (type == 2)
				return dt.ToString("yyyy-MM-dd HH:mm:ss");
			else if (type == 3)
				return dt.ToString("yyyy-MM-dd");
			else if (type == 4)
				return dt.ToString("yyyyMMdd");
			else if (type == 5)
				return dt.ToString("yyyyMM");
			else if (type == 6)
				return dt.ToString("yyyyMMdd_HHmmss");
			else
				throw new ProgramLogicException();
		}
		public static string RandomAlphaNumericString(int len)
		{
			string text = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
			StringBuilder builder = new StringBuilder(len);
			//Random random = new Random();		// sometimes cause same random number sequence.

			for (int i = 0; i < len; i++)
				builder.Append(text[Warehouse.Random.Next(text.Length)]);
			return builder.ToString();
		}
		public static bool WithinCharSetUserName(string text)
		{
			for (int i = 0; i < text.Length; i++)
			{
				char code = text[i];

				if (code >= 0x80) continue;

				if (code >= 0x61 && code <= 0x7A) continue;		// a..z
				if (code >= 0x41 && code <= 0x5A) continue;		// A..Z
				if (code >= 0x30 && code <= 0x39) continue;		// 0..9

				if (i == 0 || i == text.Length - 1) return false;

				if (" .-_".IndexOf(code) == -1) return false;
			}
			return true;
		}
		public static bool IsNumber(char ch)
		{
			return ch >= '0' && ch <= '9';
		}
		public static bool IsNumber(string str, int start)
		{
			return IsNumber(str, start, str.Length);
		}
		public static bool IsNumber(string str, int start, int end/*exclusive*/)
		{
			if (end > str.Length)
				end = str.Length;

			if (start >= end)
				return false;

			while (start < end)
			{
				char ch = str[start];
				if (ch < '0' || ch > '9')
					return false;
				start++;
			}
			return true;
		}
	}
}