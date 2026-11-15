use strict; use warnings; local $/;
sub rd { my $f=shift; open(my $h,'<:raw',$f) or die "$f"; my $c=<$h>; close $h; $c }
my $css=rd("common.css"); my $js=rd("common.js");
for my $g (['robotic-arm','arm'],['suit-maintenance','suit'],['lrrr','lrrr']){
  my($out,$part)=@$g; my $p=rd("$part.part"); my($pc,$rest)=split(/\@\@BODY\@\@\n/,$p,2); my($body,$gs)=split(/\@\@JS\@\@\n/,$rest,2);
  my $html=rd("head-$out.html")."\n".$css.$pc."</style></head><body>\n".$body."<script>\n".$js."\n</script>\n<script>\n".$gs."</script>\n<script src=\"mg-lang.js\"></script></body></html>\n";
  open(my $o,'>:raw',"../../minigames/$out.html") or die; print $o $html; close $o; print "$out ".length($html)."\n";
}
