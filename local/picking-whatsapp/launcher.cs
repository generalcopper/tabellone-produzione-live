using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class PickingJob {
  [StructLayout(LayoutKind.Sequential)] struct IO { public ulong a,b,c,d,e,f; }
  [StructLayout(LayoutKind.Sequential)] struct BASIC {
    public long a,b; public uint flags; public UIntPtr min,max; public uint processes;
    public UIntPtr affinity; public uint priority, scheduling;
  }
  [StructLayout(LayoutKind.Sequential)] struct EXT {
    public BASIC basic; public IO io; public UIntPtr processMemory,jobMemory,peakProcess,peakJob;
  }
  [StructLayout(LayoutKind.Sequential)] struct CPU { public uint flags,rate; }
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct STARTUP {
    public uint cb; public string reserved,desktop,title; public uint x,y,xsize,ysize,xcount,ycount,fill,flags;
    public ushort show,reservedSize; public IntPtr reserved2,input,output,error;
  }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS { public IntPtr process,thread; public uint pid,tid; }
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes,string name);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int type,IntPtr info,uint length);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string app,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref STARTUP startup,out PROCESS process);
  [DllImport("kernel32.dll",SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint ms);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
  [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process,uint code);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  static void Configure<T>(IntPtr job,int type,T data) {
    int size=Marshal.SizeOf(typeof(T)); IntPtr ptr=Marshal.AllocHGlobal(size);
    try { Marshal.StructureToPtr(data,ptr,false); if(!SetInformationJobObject(job,type,ptr,(uint)size)) throw new Win32Exception(); }
    finally { Marshal.FreeHGlobal(ptr); }
  }
  public static uint Run(string node,string script,string root) {
    IntPtr job=CreateJobObject(IntPtr.Zero,null); if(job==IntPtr.Zero) throw new Win32Exception();
    PROCESS p=new PROCESS();
    try {
      EXT ext=new EXT(); ext.basic.flags=0x2000|0x200|0x20; ext.basic.priority=0x4000;
      ext.jobMemory=(UIntPtr)(1536UL*1024*1024); Configure(job,9,ext);
      CPU cpu=new CPU(); cpu.flags=1|4; cpu.rate=1000; Configure(job,15,cpu);
      STARTUP startup=new STARTUP(); startup.cb=(uint)Marshal.SizeOf(typeof(STARTUP));
      var command=new StringBuilder("\""+node+"\" --max-old-space-size=192 \""+script+"\"");
      if(!CreateProcess(node,command,IntPtr.Zero,IntPtr.Zero,false,0x4|0x08000000,IntPtr.Zero,root,ref startup,out p)) throw new Win32Exception();
      if(!AssignProcessToJobObject(job,p.process)) { TerminateProcess(p.process,1); throw new Win32Exception(); }
      if(ResumeThread(p.thread)==0xffffffff) { TerminateProcess(p.process,1); throw new Win32Exception(); }
      WaitForSingleObject(p.process,0xffffffff); uint code; GetExitCodeProcess(p.process,out code); return code;
    } finally { if(p.thread!=IntPtr.Zero) CloseHandle(p.thread); if(p.process!=IntPtr.Zero) CloseHandle(p.process); CloseHandle(job); }
  }

  public static int Main(string[] args) {
    string root=AppDomain.CurrentDomain.BaseDirectory;
    using (var mutex=new System.Threading.Mutex(false,"Local\\LGPickingWhatsAppWorker")) {
      if(!mutex.WaitOne(0)) return 0;
      try {
        string temp=System.IO.Path.Combine(root,"data","temp"); System.IO.Directory.CreateDirectory(temp);
        Environment.SetEnvironmentVariable("PICKING_WA_ROOT",root);
        Environment.SetEnvironmentVariable("TEMP",temp); Environment.SetEnvironmentVariable("TMP",temp);
        string script=args.Length==1 && args[0]=="--probe" ? "probe.cjs" : "worker.cjs";
        uint code=Run("C:\\Program Files\\nodejs\\node.exe",System.IO.Path.Combine(root,script),root);
        return code==0 ? 0 : 1;
      } catch(Exception e) {
        System.IO.File.AppendAllText(System.IO.Path.Combine(root,"data","launcher.log"),DateTime.UtcNow.ToString("o")+" "+e.GetType().Name+": "+e.Message+Environment.NewLine);
        return 1;
      } finally { mutex.ReleaseMutex(); }
    }
  }
}
